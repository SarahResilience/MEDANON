package ch.medanon.local.v2;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

@CapacitorPlugin(name = "SaveDocument")
public class SaveDocumentPlugin extends Plugin {
    @PluginMethod
    public void savePdf(PluginCall call) {
        if (call.getString("data") == null) {
            call.reject("Le PDF est vide.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_TITLE, "document_ANONYMISE.pdf");
        startActivityForResult(call, intent, "saveResult");
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("Aucune destination sélectionnée.");
            return;
        }
        new Thread(() -> {
            try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (stream == null) throw new java.io.IOException("Destination indisponible");
                stream.write(Base64.decode(call.getString("data"), Base64.DEFAULT));
                stream.flush();
            } catch (Exception error) {
                call.reject("Impossible d’écrire le PDF dans la destination sélectionnée.");
                return;
            }
            JSObject response = new JSObject();
            response.put("saved", true);
            call.resolve(response);
        }).start();
    }
}
