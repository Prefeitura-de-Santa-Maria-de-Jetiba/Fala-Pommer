import { Outlet } from "react-router";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import "./reCAPTCHALayout.css";

function RecaptchaLayout() {

    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            useEnterprise={true}
        >
            <Outlet />
            <small className="recaptcha-aviso">
                Este site é protegido pelo reCAPTCHA.
            </small>
        </GoogleReCaptchaProvider>
    );
}

export default RecaptchaLayout
