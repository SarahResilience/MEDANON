package ch.medanon.local;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Base64;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 42;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;

                Intent camera = createCameraIntent();
                if (params.isCaptureEnabled() && acceptsImage(params) && camera != null) {
                    startActivityForResult(camera, FILE_CHOOSER_REQUEST);
                    return true;
                }

                Intent content = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                content.addCategory(Intent.CATEGORY_OPENABLE);
                content.setType("*/*");
                content.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"});

                Intent chooser = Intent.createChooser(content, "Choisir un document médical");
                if (camera != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                return true;
            }
        });

        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
    }

    private boolean acceptsImage(WebChromeClient.FileChooserParams params) {
        String[] types = params.getAcceptTypes();
        if (types == null || types.length == 0) return true;
        for (String t : types) if (t != null && t.startsWith("image/")) return true;
        return false;
    }

    private Intent createCameraIntent() {
        try {
            File dir = new File(getCacheDir(), "camera");
            if (!dir.exists()) dir.mkdirs();
            File photo = File.createTempFile("medanon_", ".jpg", dir);
            cameraUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photo);
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            return intent.resolveActivity(getPackageManager()) != null ? intent : null;
        } catch (Exception e) {
            cameraUri = null;
            return null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getData() != null) result = new Uri[]{data.getData()};
            else if (cameraUri != null) result = new Uri[]{cameraUri};
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
        cameraUri = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    public static class AndroidBridge {
        private final Context context;
        AndroidBridge(Context context) { this.context = context; }

        @JavascriptInterface
        public void copyText(String text) {
            ClipboardManager cm = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("Texte anonymisé", text));
            Toast.makeText(context, "Texte anonymisé copié", Toast.LENGTH_SHORT).show();
        }

        @JavascriptInterface
        public void savePdf(String dataUri, String filename) {
            try {
                int comma = dataUri.indexOf(',');
                String b64 = comma >= 0 ? dataUri.substring(comma + 1) : dataUri;
                byte[] bytes = Base64.getDecoder().decode(b64);
                OutputStream out;
                String savedTo;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                    values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MedAnon");
                    Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new IllegalStateException("Impossible de créer le fichier");
                    out = context.getContentResolver().openOutputStream(uri);
                    savedTo = "Téléchargements/MedAnon/" + filename;
                } else {
                    File dir = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "MedAnon");
                    if (!dir.exists()) dir.mkdirs();
                    File file = new File(dir, filename);
                    out = new FileOutputStream(file);
                    savedTo = file.getAbsolutePath();
                }
                if (out == null) throw new IllegalStateException("Flux de sortie indisponible");
                try (OutputStream os = out) { os.write(bytes); }
                Toast.makeText(context, "PDF enregistré : " + savedTo, Toast.LENGTH_LONG).show();
            } catch (Exception e) {
                Toast.makeText(context, "Échec de l'export PDF", Toast.LENGTH_LONG).show();
            }
        }
    }
}
