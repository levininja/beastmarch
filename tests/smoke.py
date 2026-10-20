"""Browser smoke test: serves the project folder, loads index.html in headless Chromium,
starts a new game and walks around. Fails on any page error. Needs `pip install playwright`.
Usage (from project root):  python3 tests/smoke.py"""
import http.server, threading, functools, os, sys
from playwright.sync_api import sync_playwright
root=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
h=functools.partial(http.server.SimpleHTTPRequestHandler,directory=root)
h.log_message=lambda *a:None
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),h); threading.Thread(target=srv.serve_forever,daemon=True).start()
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None) if os.environ.get('CHROMIUM') else p.chromium.launch()
    pg=b.new_page(viewport={'width':1100,'height':800})
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://127.0.0.1:%d/index.html'%srv.server_address[1]); pg.wait_for_timeout(1500)
    title=pg.inner_text('#panel')
    pg.keyboard.press('n'); pg.wait_for_timeout(800)
    for k in ['d','d','s','s','a','w']*3: pg.keyboard.press(k); pg.wait_for_timeout(60)
    pg.keyboard.press('m'); pg.wait_for_timeout(500)
    pg.screenshot(path=os.environ.get('SHOT','/tmp/smoke.png'))
    state=pg.inner_text('#hud')
    b.close()
print('title panel:',title[:60].replace('\n',' | ')); print('hud:',state.replace('\n',' | ')[:80])
print('page errors:',errs or 'none'); sys.exit(1 if errs or 'Beastmarch' not in title+state and not state else 0)
