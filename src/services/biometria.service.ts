import { Capacitor } from "@capacitor/core";
import {
    AndroidBiometryStrength,
    BiometricAuth,
} from "@aparajita/capacitor-biometric-auth";

export async function verificarBiometriaDisponivel() {
    if (!Capacitor.isNativePlatform()) {
        return false;
    }

    const resultado = await BiometricAuth.checkBiometry();
    return resultado.isAvailable;
}

export async function autenticarComBiometria() {
    if (!(await verificarBiometriaDisponivel())) {
        throw new Error("Biometria não disponível neste dispositivo.");
    }

    await BiometricAuth.authenticate({
        reason: "Confirme sua identidade para acessar o Fala Pommer",
        androidTitle: "Login com biometria",
        androidSubtitle: "Use sua biometria para continuar",
        androidConfirmationRequired: false,
        androidBiometryStrength: AndroidBiometryStrength.strong,
        allowDeviceCredential: true, // (allowDeviceCredential: true) permite PIN, senha ou padrão do aparelho como alternativa, caso for falso somente biometria 
    });
}
