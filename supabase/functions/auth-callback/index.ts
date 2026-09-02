const APP_SCHEME = 'app.anya.eargym';

Deno.serve((_req) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PitchGym - Email confirmed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #08070C;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    p {
      color: rgba(255,255,255,0.6);
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #C8DA59;
      color: #08070C;
      font-weight: 700;
      font-size: 16px;
      padding: 14px 32px;
      border-radius: 999px;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.85; }
    .desktop-msg {
      display: none;
      color: rgba(255,255,255,0.5);
      font-size: 14px;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10003;</div>
    <h1>Email confirmed</h1>
    <p id="message">Redirecting you to PitchGym...</p>
    <a id="open-app" class="btn" href="#">Open PitchGym</a>
    <p id="desktop-msg" class="desktop-msg"></p>
  </div>
  <script>
    (function() {
      var fragment = window.location.hash || '';
      var deepLink = '${APP_SCHEME}://auth/callback' + fragment;
      var openBtn = document.getElementById('open-app');
      var message = document.getElementById('message');
      var desktopMsg = document.getElementById('desktop-msg');

      openBtn.href = deepLink;

      var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        window.location.href = deepLink;
      } else {
        message.textContent = 'Your email has been verified.';
        openBtn.style.display = 'none';
        desktopMsg.style.display = 'block';
        desktopMsg.textContent = 'Open PitchGym on your phone to sign in.';
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});