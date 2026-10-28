package com.layansskate.game;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebChromeClient;
import java.io.ByteArrayInputStream;
import java.util.HashMap;

/** Offline WebGL game. No JavaScript bridge, network permission or file access. */
public final class MainActivity extends Activity {
  private WebView game;
  private static final String ORIGIN = "https://appassets.androidplatform.net";
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    game = new WebView(this);
    game.setBackgroundColor(0xff172b31);
    game.getSettings().setJavaScriptEnabled(true);
    game.getSettings().setDomStorageEnabled(true);
    game.getSettings().setAllowFileAccess(false);
    game.getSettings().setAllowContentAccess(false);
    game.getSettings().setMediaPlaybackRequiresUserGesture(true);
    game.setWebChromeClient(new WebChromeClient());
    game.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        try {
          String file = url.equals(ORIGIN + "/assets/index.html") ? "index.html" :
            url.equals(ORIGIN + "/assets/THIRD_PARTY_NOTICES.txt") ? "THIRD_PARTY_NOTICES.txt" : null;
          if (file != null) {
            HashMap<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(file.endsWith("html") ? "text/html" : "text/plain", "UTF-8", 200, "OK", headers, getAssets().open(file));
          }
        } catch (Exception ignored) { }
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
      }
    });
    setContentView(game);
    immersive();
    game.loadUrl(ORIGIN + "/assets/index.html");
  }
  private void immersive() {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
      View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
      View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  }
  @Override public void onWindowFocusChanged(boolean focused) { super.onWindowFocusChanged(focused); if (focused) immersive(); }
  @Override protected void onPause() {
    game.evaluateJavascript("window.dispatchEvent(new Event('blur'))", null);
    game.onPause(); game.pauseTimers(); super.onPause();
  }
  @Override protected void onResume() { super.onResume(); if (game != null) { game.resumeTimers(); game.onResume(); } }
  @Override public void onBackPressed() {
    game.evaluateJavascript("(()=>{const t=document.getElementById('scene')||document.body;t.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));t.dispatchEvent(new KeyboardEvent('keyup',{key:'Escape',code:'Escape',bubbles:true}))})()", null);
  }
  @Override protected void onDestroy() { game.destroy(); super.onDestroy(); }
}
