import { useState } from "react";
import { KeyRound, ShieldAlert } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { changeOwnPassword } from "../../api/userApi";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";

export default function ChangePasswordModal({ onClose, forced = false, onSuccess }) {
    const { t } = useTheme();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const valid = current && next.length >= 6 && next === confirm;

    async function submit() {
        setError("");
        if (next !== confirm) return setError("New passwords do not match.");
        if (next.length < 6) return setError("Password must be at least 6 characters.");

        setSaving(true);
        try {
            await changeOwnPassword(current, next);
            onSuccess?.();
            onClose?.();
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal title="Change Password" onClose={forced ? undefined : onClose}>
            {forced && (
                <div style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    padding: "12px 14px", marginBottom: 18, borderRadius: 9,
                    background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                }}>
                    <ShieldAlert size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5 }}>
                        Your password was reset by an administrator. Please set a new password to continue.
                    </div>
                </div>
            )}

            <div style={{ display: "grid", gap: 14 }}>
                <Field label="Current Password" type="password" value={current}
                       onChange={(e) => setCurrent(e.target.value)} />
                <Field label="New Password" type="password" value={next}
                       onChange={(e) => setNext(e.target.value)} placeholder="At least 6 characters" />
                <Field label="Confirm New Password" type="password" value={confirm}
                       onChange={(e) => setConfirm(e.target.value)} />

                {error && <div style={{ fontSize: 13, color: "#ef4444" }}>{error}</div>}

                <Button onClick={submit} disabled={!valid || saving} full>
                    <KeyRound size={15} /> {saving ? "Updating…" : "Change Password"}
                </Button>
            </div>
        </Modal>
    );
}