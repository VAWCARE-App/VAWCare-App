import React, { useState } from "react";
import { Modal, Form, Input, Button, message, Steps, Typography } from "antd";
import axios from "axios";
import logo from "../../assets/logo1.png";

const { Step } = Steps;
const { Title, Paragraph } = Typography;

export default function ForgotPasswordModal({ open, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [sendingOTP, setSendingOTP] = useState(false);
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [otp, setOtp] = useState(Array(6).fill(""));
    const [form] = Form.useForm();

    const apiUrl = import.meta.env.VITE_API_URL;
    const BRAND_COLOR = "#e91e63";

    // --- STEP 1: Send OTP ---
    const handleSendOTP = async () => {
        setSendingOTP(true);
        setEmailError("");
        try {
            const res = await axios.post(`${apiUrl}/api/auth/send-otp`, { email }, {
                headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY }
            });
            message.success(res?.data?.message || "OTP sent to your email.");
            setCurrentStep(1);
        } catch (error) {
            // Prefer server-provided message when available
            const serverMsg = error?.response?.data?.message;
            const fallback = "Failed to send OTP. Please check your email.";
            const errMsg = serverMsg || (error && error.message) || fallback;
            // If server indicates email not found
            if (serverMsg && /not found|not exist|no user|no account|not registered/i.test(serverMsg)) {
                setEmailError("This email is not registered. Please check or sign up.");
            }
            message.error(errMsg);
        } finally {
            setSendingOTP(false);
        }
    };

    // --- OTP Input Logic ---
    const handleOTPChange = (value, index) => {
        if (!/^\d*$/.test(value)) return;
        const updated = [...otp];
        updated[index] = value;
        setOtp(updated);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleOTPKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    // --- STEP 2: Verify OTP ---
    const handleVerifyOTP = async () => {
        const otpString = otp.join("");
        if (otpString.length !== 6 || otpString.includes("")) {
            message.error("Please enter all 6 digits of the OTP.");
            return;
        }
        try {
            const res = await axios.post(`${apiUrl}/api/auth/verify-otp`, { email, otp: otpString }, {
                headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY }
            });
            message.success(res?.data?.message || "OTP verified successfully!");
            setCurrentStep(2);
        } catch (error) {
            const serverMsg = error?.response?.data?.message;
            const fallback = "Invalid OTP. Please try again.";
            message.error(serverMsg || (error && error.message) || fallback);
        }
    };

    // --- STEP 3: Reset Password ---
    const handleResetPassword = async ({ password }) => {
        try {
            const res = await axios.post(`${apiUrl}/api/auth/reset-password`, { email, password }, {
                headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY }
            });
            message.success(res?.data?.message || "Password reset successfully!");
            form.resetFields();
            setCurrentStep(0);
            onClose();
        } catch (error) {
            const serverMsg = error?.response?.data?.message;
            const fallback = "Failed to reset password.";
            message.error(serverMsg || (error && error.message) || fallback);
        }
    };

    const resetModal = () => {
        setCurrentStep(0);
        setEmail("");
        setOtp(Array(6).fill(""));
        form.resetFields();
        onClose();
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                        <Form layout="vertical" form={form} onFinish={handleSendOTP}>
                        <Title
                            level={4}
                            style={{ textAlign: "center", color: BRAND_COLOR, marginBottom: 8 }}
                        >
                            Forgot Password
                        </Title>
                        <Paragraph
                            style={{ textAlign: "center", color: "#666", marginBottom: 24 }}
                        >
                            Enter the email linked to your account. We’ll send you a code to
                            reset your password.
                        </Paragraph>

                        <Form.Item
                            name="email"
                            label={<span style={{ fontWeight: 500 }}>Email Address</span>}
                            rules={[
                                { required: true, type: "email", message: "Enter a valid email", transform: (value) => (typeof value === 'string' ? value.trim() : value) },
                            ]}
                        >
                            <Input
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setEmail(v);
                                    try { form.setFieldsValue({ email: v }); } catch (e) { /* ignore if form unmounted */ }
                                }}
                                style={{ borderRadius: 8 }}
                            />
                            {emailError && (
                                <div style={{ color: '#ff4d4f', marginTop: 6, fontSize: 12 }}>
                                    {emailError}
                                </div>
                            )}
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={sendingOTP}
                            style={{
                                backgroundColor: BRAND_COLOR,
                                borderColor: BRAND_COLOR,
                                borderRadius: 8,
                                fontWeight: 500,
                            }}
                        >
                            {sendingOTP ? "Sending..." : "Send OTP"}
                        </Button>
                    </Form>
                );

            case 1:
                return (
                    <div>
                        <Title
                            level={4}
                            style={{ textAlign: "center", color: BRAND_COLOR, marginBottom: 8 }}
                        >
                            Verify Code
                        </Title>
                        <Paragraph
                            style={{ textAlign: "center", color: "#666", marginBottom: 20 }}
                        >
                            We’ve sent a 6-digit code to your email. Enter it below.
                        </Paragraph>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: "10px",
                                marginBottom: 24,
                            }}
                        >
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Input
                                    key={index}
                                    id={`otp-${index}`}
                                    maxLength={1}
                                    value={otp[index] || ""}
                                    onChange={(e) => handleOTPChange(e.target.value, index)}
                                    onKeyDown={(e) => handleOTPKeyDown(e, index)}
                                    style={{
                                        width: 42,
                                        height: 42,
                                        textAlign: "center",
                                        fontSize: 18,
                                        borderRadius: 8,
                                        border: "1px solid #ddd",
                                    }}
                                />
                            ))}
                        </div>

                        <Button
                            type="primary"
                            block
                            onClick={handleVerifyOTP}
                            style={{
                                backgroundColor: BRAND_COLOR,
                                borderColor: BRAND_COLOR,
                                borderRadius: 8,
                                fontWeight: 500,
                            }}
                        >
                            Verify OTP
                        </Button>
                    </div>
                );

            case 2:
                return (
                    <Form layout="vertical" form={form} onFinish={handleResetPassword}>
                        <Title
                            level={4}
                            style={{ textAlign: "center", color: BRAND_COLOR, marginBottom: 8 }}
                        >
                            Reset Password
                        </Title>
                        <Paragraph
                            style={{ textAlign: "center", color: "#666", marginBottom: 24 }}
                        >
                            Create a strong password that’s easy to remember but hard to guess.
                        </Paragraph>

                        <Form.Item
                            name="password"
                            label="New Password"
                            rules={[
                                { required: true, message: "Please enter a new password" },
                                {
                                    pattern:
                                        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
                                    message: "Use 8+ chars incl. A-Z, a-z, 0-9, symbol",
                                },
                            ]}
                            hasFeedback
                        >
                            <Input.Password
                                placeholder="Enter new password"
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirm"
                            label="Confirm Password"
                            dependencies={["password"]}
                            hasFeedback
                            rules={[
                                { required: true, message: "Please confirm your password" },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue("password") === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject("Passwords do not match");
                                    },
                                }),
                            ]}
                        >
                            <Input.Password
                                placeholder="Re-enter password"
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            style={{
                                backgroundColor: BRAND_COLOR,
                                borderColor: BRAND_COLOR,
                                borderRadius: 8,
                                fontWeight: 500,
                            }}
                        >
                            Reset Password
                        </Button>
                    </Form>
                );

            default:
                return null;
        }
    };

    return (
        <Modal
            title={null}
            open={open}
            onCancel={resetModal}
            footer={null}
            centered
            destroyOnClose
            bodyStyle={{ padding: "12px 8px 24px" }}
        >
            <div style={{ textAlign: "center", marginBottom: 24 }}>
                <img src={logo} alt="VAWCare Logo" style={{ width: 60, marginBottom: 16 }} />
                <Steps
                    size="small"
                    current={currentStep}
                    items={[
                        { title: "Email" },
                        { title: "OTP" },
                        { title: "Reset" },
                    ]}
                    style={{ maxWidth: 360, margin: "auto" }}
                />
            </div>
            {renderStepContent()}
        </Modal>
    );
}
