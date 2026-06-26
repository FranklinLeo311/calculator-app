package franklinleo.calculator;

import android.telephony.SmsManager;
import android.os.Build;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.ArrayList;

public class SmsSenderModule extends ReactContextBaseJavaModule {

    SmsSenderModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "SmsSender";
    }

    @ReactMethod
    public void sendSMS(String phoneNumber, String message, Promise promise) {
        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = getReactApplicationContext()
                    .getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            if (smsManager == null) {
                promise.reject("SMS_ERROR", "SmsManager not available");
                return;
            }

            // Split long messages into parts automatically
            ArrayList<String> parts = smsManager.divideMessage(message);
            if (parts.size() == 1) {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            } else {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SMS_ERROR", e.getMessage());
        }
    }
}
