package com.krishidrishti.app;

import android.net.DnsResolver;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "KrishiDrishti";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Allow mixed content (required for Capacitor https://localhost → http backend in dev)
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Pre-warm DNS resolution for the Cloudflare Worker proxy using the system's DNS resolver.
        // This resolves the proxy host on a background thread as soon as the app opens.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                DnsResolver resolver = DnsResolver.getInstance();
                CancellationSignal cancel = new CancellationSignal();
                resolver.query(
                    null,
                    "krishi-drishti-proxy.swanky-mine.workers.dev",
                    DnsResolver.TYPE_A,
                    DnsResolver.FLAG_EMPTY,
                    command -> new Thread(command).start(),
                    cancel,
                    new DnsResolver.Callback<java.util.List<java.net.InetAddress>>() {
                        @Override
                        public void onAnswer(java.util.List<java.net.InetAddress> addrs, int rcode) {
                            if (!addrs.isEmpty()) {
                                Log.i(TAG, "[DNS] Pre-warmed: " + addrs.get(0).getHostAddress());
                            } else {
                                Log.w(TAG, "[DNS] Pre-warm returned empty answer (rcode=" + rcode + ")");
                            }
                        }
                        @Override
                        public void onError(DnsResolver.DnsException e) {
                            Log.w(TAG, "[DNS] Pre-warm failed: " + e.getMessage());
                        }
                    }
                );
            } catch (Exception e) {
                Log.w(TAG, "[DNS] Pre-warm exception: " + e.getMessage());
            }
        }
    }
}
