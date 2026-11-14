# Probe: seeing the studio move without a screen

A browser that is not in front draws one frame a second, so a test browser
shows the visuals as stills. This starts a headless Chrome that is not held
back, drives it over the DevTools protocol and saves frames while a script
runs in the page, so movement (a fade, a datamosh, the looks taking turns) can
be checked from a terminal.

    # the studio must be serving: npx vite --port 4433
    google-chrome --headless=new --remote-debugging-port=9333 \
      --user-data-dir=/tmp/jdl-probe --window-size=1280,800 \
      --disable-background-timer-throttling --disable-renderer-backgrounding \
      --disable-backgrounding-occluded-windows \
      --autoplay-policy=no-user-gesture-required \
      --use-fake-ui-for-media-stream --use-fake-device-for-media-stream \
      --enable-unsafe-swiftshader --no-first-run http://localhost:4433/ &

    node scripts/probe/cdp.mjs my-test.js 8 250 shot   # 8 frames, 250 ms apart
    python3 scripts/probe/sheet.py shot 4              # one image, 4 across

`my-test.js` is the body of an async function run in the page; what it returns
is printed. Frames are saved in the folder it is run from.

What it is good for: Chrome's fake camera and microphone are real streams, so
the webcam visuals, VJ → Motion and the permission flow work. What it is not:
the graphics are drawn in software, so its frame rate says nothing about a
real GPU (the headless Chrome here would not take the machine's).
