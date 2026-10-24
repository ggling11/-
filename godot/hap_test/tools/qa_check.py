#!/usr/bin/env python3
"""합 시험판 검수 도우미 (qa.sh 가 부른다). 파이썬 표준 라이브러리만 쓴다.

  qa_check.py png <파일...>                 해상도 · 평균/표준편차 휘도 (빈 화면 검사: 표준편차 >= 8)
  qa_check.py result <결과 파일>             결과 텍스트 형식 (key=value 묶음, 필수 키, 숫자 값)
  qa_check.py flash <폴더> [<조명 끈 폴더>]    flash_pre*.png / flash_NN.png 연속 프레임 평균 휘도, 두 장면 차이 = 섬광 성분
  qa_check.py pe <exe> <gui|console>        PE32+ x86-64, 하위 시스템(GUI=2 / 콘솔=3), 버전 정보 문자열
  qa_check.py pck <pck>                      PCK 목차를 읽어 Vulkan 셰이더 캐시 파일 수를 센다
  qa_check.py zip <zip> <이름...>            zip 안의 파일 이름(빠짐 · 남는 것), 한글 이름의 UTF-8 표시, 읽어주세요 BOM+CRLF
"""
import glob
import os
import struct
import sys
import zipfile
import zlib


# ───────────── PNG ─────────────

def load_png(path):
    d = open(path, "rb").read()
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("PNG 아님")
    i, idat, w, h, ct, bd = 8, b"", 0, 0, 0, 8
    while i < len(d):
        ln, = struct.unpack(">I", d[i:i + 4])
        t = d[i + 4:i + 8]
        c = d[i + 8:i + 8 + ln]
        i += 12 + ln
        if t == b"IHDR":
            w, h, bd, ct = struct.unpack(">IIBB", c[:10])
        elif t == b"IDAT":
            idat += c
    if bd != 8:
        raise ValueError("8비트 PNG만 읽는다")
    bpp = {2: 3, 6: 4, 0: 1, 4: 2}[ct]
    raw = zlib.decompress(idat)
    stride = w * bpp
    out = bytearray()
    prev = bytearray(stride)
    pos = 0
    for _ in range(h):
        f = raw[pos]
        line = bytearray(raw[pos + 1:pos + 1 + stride])
        pos += 1 + stride
        if f == 1:
            for x in range(bpp, stride):
                line[x] = (line[x] + line[x - bpp]) & 255
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else (b if pb <= pc else c))) & 255
        out += line
        prev = line
    return w, h, bpp, out


def luma_stats(path, step=2):
    w, h, bpp, px = load_png(path)
    n = 0
    s = 0.0
    s2 = 0.0
    for y in range(0, h, step):
        row = y * w * bpp
        for x in range(0, w, step):
            i = row + x * bpp
            if bpp >= 3:
                v = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
            else:
                v = px[i]
            s += v
            s2 += v * v
            n += 1
    m = s / n
    return w, h, m, max(0.0, s2 / n - m * m) ** 0.5


def cmd_png(paths):
    bad = 0
    for p in paths:
        try:
            w, h, m, sd = luma_stats(p)
        except Exception as e:  # noqa: BLE001
            print(f"FAIL {os.path.basename(p)}: {e}")
            bad += 1
            continue
        ok = sd >= 8.0 and (w, h) == (1280, 720)
        bad += 0 if ok else 1
        print(f"{'OK  ' if ok else 'FAIL'} {os.path.basename(p)} {w}x{h} mean_luma={m:.1f} std={sd:.1f}")
    return 0 if bad == 0 and paths else 1


# ───────────── 결과 파일 ─────────────

REQUIRED = ["hap_test_version", "godot", "os", "cpu", "cpu_threads", "gpu", "driver", "rendering_method", "resolution",
            "refresh_hz", "vsync_during_bench", "segment_seconds", "warmup_seconds", "recommended"]
PER_PRESET = ["avg_fps", "p1_low_fps", "max_frame_ms", "hitches_over_50ms", "hitches_first_5s", "frames",
              "render_scale", "aa", "sun_shadow_size", "sun_shadow_distance", "ssao", "volumetric_fog",
              "lantern_shadows", "grass", "leaves", "screen_shader"]
NUMERIC = ["avg_fps", "p1_low_fps", "max_frame_ms", "hitches_over_50ms", "hitches_first_5s", "frames", "render_scale",
           "sun_shadow_size", "sun_shadow_distance", "grass", "leaves"]


def cmd_result(path):
    raw = open(path, "rb").read()
    bom = raw.startswith(b"\xef\xbb\xbf")
    text = raw.decode("utf-8-sig")
    problems = []
    for head in ["합 시험판 결과", "시험판:", "OS:", "CPU:", "GPU:", "그래픽 드라이버:", "해상도:", "추천 단계:", "단계별 실제 설정:",
                 "--- 기계용 (key=value) ---", "--- 끝 ---"]:
        if head not in text:
            problems.append("사람용 줄 없음: " + head)
    try:
        block = text.split("--- 기계용 (key=value) ---", 1)[1].split("--- 끝 ---", 1)[0]
    except IndexError:
        block = ""
    kv = {}
    for line in block.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        if "=" not in line:
            problems.append("key=value 아님: " + line)
            continue
        k, v = line.split("=", 1)
        kv[k] = v
    for k in REQUIRED:
        if k not in kv:
            problems.append("필수 키 없음: " + k)
    for p in ["low", "mid", "high", "max"]:
        for k in PER_PRESET:
            key = f"{p}.{k}"
            if key not in kv:
                problems.append("단계 키 없음: " + key)
            elif k in NUMERIC:
                try:
                    float(kv[key])
                except ValueError:
                    problems.append(f"숫자 아님: {key}={kv[key]}")
    if kv.get("recommended") not in ("low", "mid", "high", "max", "none"):
        problems.append("recommended 값 이상: " + str(kv.get("recommended")))
    print(f"result file={path} bytes={len(raw)} utf8_bom={bom} crlf={b'\r\n' in raw} keys={len(kv)}")
    for p in ["low", "mid", "high", "max"]:
        print(f"  {p}: avg_fps={kv.get(p + '.avg_fps')} p1_low={kv.get(p + '.p1_low_fps')} max_ms={kv.get(p + '.max_frame_ms')} "
              f"hitches={kv.get(p + '.hitches_over_50ms')} first5s={kv.get(p + '.hitches_first_5s')} frames={kv.get(p + '.frames')}")
    print(f"  recommended={kv.get('recommended')} driver={kv.get('driver')} gpu={kv.get('gpu')} resolution={kv.get('resolution')}")
    for pr in problems:
        print("  문제: " + pr)
    return 0 if not problems else 1


# ───────────── 섬광 ─────────────

def _flash_series(folder):
    pre = sorted(glob.glob(os.path.join(folder, "flash_pre*.png")))
    post = sorted(glob.glob(os.path.join(folder, "flash_[0-9][0-9].png")))
    return [luma_stats(p, 2)[2] for p in pre], [luma_stats(p, 2)[2] for p in post]


def cmd_flash(folder, nolight=None):
    """연속 프레임 평균 휘도. nolight 폴더(섬광 조명만 끈 같은 장면)를 주면 두 장면의 차이 = 섬광 성분."""
    pre_a, post_a = _flash_series(folder)
    if not pre_a or not post_a:
        print("FAIL 프레임 PNG 없음")
        return 1
    base_a = sum(pre_a) / len(pre_a)
    print(f"[전체] 기준(터지기 전 {len(pre_a)}프레임) 평균 휘도 {base_a:.2f}")
    if nolight is None:
        for k, v in enumerate(post_a):
            print(f"  frame {k:02d} t={k / 60:.4f}s luma={v:.2f} excess={v - base_a:+.2f}")
        return 0
    pre_b, post_b = _flash_series(nolight)
    same_pre = max(abs(x - y) for x, y in zip(pre_a, pre_b)) if pre_b else 99.0
    print(f"[결정성] 터지기 전 프레임 휘도 차이 최대 {same_pre:.3f} (같은 씨앗 · 고정 60fps)")
    print("  frame  t(s)    전체-기준  섬광 성분(조명 켬-끔)")
    flash = []
    for k, (x, y) in enumerate(zip(post_a, post_b)):
        flash.append(x - y)
        mark = "  <- 0.1초" if abs(k / 60 - 0.1) < 1e-9 else ""
        print(f"  {k:02d}  {k / 60:.4f}  {x - base_a:+7.2f}   {x - y:+7.2f}{mark}")
    peak = max(flash)
    tail = max(abs(v) for k, v in enumerate(flash) if k / 60 >= 0.1 - 1e-9)
    ratio = tail / peak if peak > 0 else 1.0
    ok = same_pre < 0.2 and peak > 0.5 and ratio <= 0.1
    print(f"섬광 성분 최고 {peak:.2f} (t={flash.index(peak) / 60:.4f}s) · 0.1초부터 최대 {tail:.2f} · 비율 {ratio:.3f} "
          f"(기준 <= 0.10) · 전체 휘도 최고 초과 {max(post_a) - base_a:.2f}")
    return 0 if ok else 1


# ───────────── PE ─────────────

def cmd_pe(path, want):
    d = open(path, "rb").read()
    if d[:2] != b"MZ":
        print("FAIL MZ 아님")
        return 1
    off = struct.unpack_from("<I", d, 0x3C)[0]
    sig = d[off:off + 4]
    machine = struct.unpack_from("<H", d, off + 4)[0]
    opt = off + 24
    magic = struct.unpack_from("<H", d, opt)[0]
    subsys = struct.unpack_from("<H", d, opt + 68)[0]
    want_sub = 2 if want == "gui" else 3
    res_types = _pe_resource_types(d, off, opt, magic)
    name_ok = "합 시험판".encode("utf-16-le") in d
    ver_ok = "0.1.0".encode("utf-16-le") in d
    ok = sig == b"PE\0\0" and machine == 0x8664 and magic == 0x20B and subsys == want_sub
    print(f"{os.path.basename(path)} size={len(d)} machine=0x{machine:x} magic=0x{magic:x}(PE32+={magic == 0x20B}) "
          f"subsystem={subsys}({'GUI' if subsys == 2 else 'console' if subsys == 3 else '?'}) "
          f"versioninfo_name={name_ok} versioninfo_0.1.0={ver_ok} "
          f"resources: icon={3 in res_types} group_icon={14 in res_types} version={16 in res_types}")
    return 0 if ok else 1


def _pe_resource_types(d, off, opt, magic):
    """리소스 디렉터리 맨 위 단계의 형식 번호들 (3=RT_ICON, 14=RT_GROUP_ICON, 16=RT_VERSION)."""
    try:
        nsec = struct.unpack_from("<H", d, off + 6)[0]
        optsz = struct.unpack_from("<H", d, off + 20)[0]
        dd = opt + (112 if magic == 0x20B else 96)
        rva, size = struct.unpack_from("<II", d, dd + 2 * 8)
        if rva == 0:
            return set()
        sec = opt + optsz
        base = None
        for i in range(nsec):
            _, vsz, va, rsz, rptr = struct.unpack_from("<8sIIII", d, sec + 40 * i)
            if va <= rva < va + max(vsz, rsz):
                base = rptr + (rva - va)
        if base is None:
            return set()
        n_named, n_id = struct.unpack_from("<HH", d, base + 12)
        types = set()
        for k in range(n_named + n_id):
            name, _ = struct.unpack_from("<II", d, base + 16 + 8 * k)
            if not name & 0x80000000:
                types.add(name)
        return types
    except struct.error:
        return set()


# ───────────── PCK ─────────────

def cmd_pck(path):
    d = open(path, "rb").read()
    magic = d[:4]
    if magic != b"GDPC":
        print("FAIL GDPC 아님")
        return 1
    fmt, major, minor, patch = struct.unpack_from("<IIII", d, 4)
    pos = 20
    flags = 0
    file_base = 0
    dir_off = None
    if fmt >= 2:
        flags, file_base = struct.unpack_from("<IQ", d, pos)
        pos += 12
    if fmt >= 3:
        dir_off, = struct.unpack_from("<Q", d, pos)
        pos += 8
    pos += 16 * 4  # reserved
    if dir_off is not None:
        pos = dir_off
    count, = struct.unpack_from("<I", d, pos)
    pos += 4
    paths = []
    ok_parse = True
    try:
        for _ in range(count):
            ln, = struct.unpack_from("<I", d, pos)
            pos += 4
            name = d[pos:pos + ln].rstrip(b"\0").decode("utf-8", "replace")
            pos += ln
            pos += 8 + 8 + 16
            if fmt >= 2:
                pos += 4
            paths.append(name)
    except struct.error:
        ok_parse = False
    vk = [p for p in paths if "shader_cache" in p and p.endswith(".vulkan.cache")]
    groups = sorted({p.split("shader_cache/", 1)[1].split("/", 1)[0] for p in vk})
    raw_count = d.count(b".vulkan.cache")
    print(f"pck format={fmt} godot={major}.{minor}.{patch} flags={flags} files={count} parsed={ok_parse and len(paths) == count} "
          f"vulkan_shader_cache_files={len(vk)} shader_groups={len(groups)} raw_string_hits={raw_count}")
    scene = [g for g in groups if g.startswith("Scene")]
    print(f"  scene shader groups: {scene}")
    print(f"  e.g. {vk[0] if vk else '-'}")
    return 0 if vk else 1


# ───────────── zip ─────────────

def cmd_zip(path, want):
    problems = []
    with zipfile.ZipFile(path) as z:
        bad = z.testzip()
        if bad is not None:
            problems.append("CRC 오류: " + bad)
        infos = z.infolist()
        names = [i.filename for i in infos]
        for i in infos:
            utf8 = bool(i.flag_bits & 0x800)
            if not i.filename.isascii() and not utf8:
                problems.append("한글 이름에 UTF-8 표시(0x800) 없음: " + i.filename)
            print(f"  {i.file_size:>11}  utf8_flag={utf8!s:<5}  {i.filename}")
        for w in want:
            if w not in names:
                problems.append("빠짐: " + w)
        for n in names:
            if n not in want:
                problems.append("목록에 없는 파일: " + n)
        for n in names:
            if n.endswith(".txt") and not n.isascii():
                raw = z.read(n)
                if not raw.startswith(b"\xef\xbb\xbf") or b"\r\n" not in raw or b"\n" in raw.replace(b"\r\n", b""):
                    problems.append("UTF-8 BOM + CRLF 아님: " + n)
    print(f"zip {os.path.basename(path)} bytes={os.path.getsize(path)} files={len(names)} 빠짐·문제={len(problems)}")
    for pr in problems:
        print("  문제: " + pr)
    return 0 if not problems else 1


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    cmd = sys.argv[1]
    if cmd == "png":
        return cmd_png(sys.argv[2:])
    if cmd == "result":
        return cmd_result(sys.argv[2])
    if cmd == "flash":
        return cmd_flash(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    if cmd == "pe":
        return cmd_pe(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "gui")
    if cmd == "pck":
        return cmd_pck(sys.argv[2])
    if cmd == "zip":
        return cmd_zip(sys.argv[2], sys.argv[3:])
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
