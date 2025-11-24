import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Typography } from "antd";
import Stepper, { Step } from "../../components/Stepper";
import axios from "axios";
import logo from "../../assets/logo1.png";
const { Title, Paragraph } = Typography;

export default function ForgotPasswordModal({ open, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [sendingOTP, setSendingOTP] = useState(false);
    const [verifyingOTP, setVerifyingOTP] = useState(false);
    const [passwordValid, setPasswordValid] = useState(false);
    const [emailValid, setEmailValid] = useState(false);
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [otp, setOtp] = useState(Array(6).fill(""));
    const [otpComplete, setOtpComplete] = useState(false);
    const [stepperCurrent, setStepperCurrent] = useState(1); // 1-based for Stepper
    const [form] = Form.useForm();

    const apiUrl = import.meta.env.VITE_API_URL;
    const BRAND_COLOR = "#e91e63";

    // --- STEP 1: Send OTP ---
    const handleSendOTP = async (emailToSend) => {
        setSendingOTP(true);
        setEmailError("");
        try {
            const res = await axios.post(`${apiUrl}/api/auth/send-otp`, { email: emailToSend, "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY });
            message.success(res?.data?.message || "OTP sent to your email.");
            setEmail(emailToSend);
            return res;
        } catch (error) {
            const serverMsg = error?.response?.data?.message;
            const fallback = "Failed to send OTP. Please check your email.";
            const errMsg = serverMsg || (error && error.message) || fallback;
            if (serverMsg && /not found|not exist|no user|no account|not registered/i.test(serverMsg)) {
                setEmailError("This email is not registered. Please check or sign up.");
            }
            message.error(errMsg);
            throw error;
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
        setOtpComplete(updated.join("").length === 6);
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
        setVerifyingOTP(true);
        const otpString = otp.join("");
        try {
            const res = await axios.post(`${apiUrl}/api/auth/verify-otp`, { email, otp: otpString });
            message.success(res?.data?.message || "OTP verified successfully!");
            return res;
                } catch (error) {
                    const serverMsg = error?.response?.data?.message;
                    const fallback = "Invalid OTP. Please try again.";
                    message.error(serverMsg || (error && error.message) || fallback);
                    throw error;
                } finally {
                    setVerifyingOTP(false);
                }
            };
        
            // --- STEP 3: Reset Password ---
            const handleResetPassword = async ({ password }) => {
                try {
                    const res = await axios.post(`${apiUrl}/api/auth/reset-password`, { email, password });
                    message.success(res?.data?.message || "Password reset successfully!");
                    form.resetFields();
                    setStepperCurrent(1);
                    setOtp(Array(6).fill(""));
                    setOtpComplete(false);
                    onClose();
                    return res;
                } catch (error) {
                    const serverMsg = error?.response?.data?.message;
                    const fallback = "Failed to reset password.";
                    message.error(serverMsg || (error && error.message) || fallback);
                    throw error;
                }
            };
        
            // --- Modal Reset ---
            const resetModal = () => {
                setStepperCurrent(1);
                setEmail("");
                setOtp(Array(6).fill(""));
                setEmailError("");
                form.resetFields();
                onClose();
            };

            // When modal opens, show the first step and clear transient state
            useEffect(() => {
                if (open) {
                    setStepperCurrent(1);
                    setEmail("");
                    setOtp(Array(6).fill(""));
                    setOtpComplete(false);
                    setEmailError("");
                    setPasswordValid(false);
                    try { form.resetFields(); } catch (e) {}
                }
            }, [open]);
        
            // --- Render Steps ---
            const renderEmailStep = () => (
                <Form
                    layout="vertical"
                    form={form}
                    onFinish={() => {}}
                    onValuesChange={(changed, all) => {
                        const emailVal = all.email;
                        const valid = typeof emailVal === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal.trim());
                        setEmailValid(!!valid);
                    }}
                >
                    <Title level={4} style={{ textAlign: "center", color: BRAND_COLOR, marginBottom: 8 }}>
                        Forgot Password
                    </Title>
                    <Paragraph style={{ textAlign: "center", color: "#666", marginBottom: 24 }}>
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
                        block
                        loading={sendingOTP}
                        onClick={async () => {
                            try {
                                const values = await form.validateFields(["email"]);
                                const emailTrim = values.email.trim();
                                await handleSendOTP(emailTrim);
                                // advance stepper on success
                                setStepperCurrent(2);
                            } catch (e) {
                                // validation or request error — do not advance
                            }
                        }}
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
        
            const renderOTPStep = () => (
                <div>
                    <Title level={4} style={{ textAlign: "center", color: BRAND_COLOR, marginBottom: 8 }}>
                        Verify Code
                    </Title>
                    <Paragraph style={{ textAlign: "center", color: "#666", marginBottom: 20 }}>
                        We’ve sent a 6-digit code to your email. Enter it below.
                    </Paragraph>
        
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: 24 }}>
                        {Array.from({ length: 6 }).map((_, index) => (
                            <Input
                                key={index}
                                id={`otp-${index}`}
                                maxLength={1}
                                value={otp[index] || ""}
                                onChange={(e) => handleOTPChange(e.target.value, index)}
                                onKeyDown={(e) => handleOTPKeyDown(e, index)}
                                style={{ width: 42, height: 42, textAlign: "center", fontSize: 18, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                        ))}
                    </div>
        
                    <Button
                        type="primary"
                        block
                        loading={verifyingOTP}
                        onClick={async () => {
                            try {
                                await handleVerifyOTP();
                                setStepperCurrent(3);
                            } catch (e) {
                                // verification failed
                            }
                        }}
                        disabled={!otpComplete}
                        style={{ backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR, borderRadius: 8, fontWeight: 500 }}
                    >
                        Verify OTP
                    </Button>
                </div>
            );
        
            const renderResetStep = () => (
                <Form layout="vertical" form={form} onFinish={handleResetPassword} onValuesChange={(changed, all) => {
                    const pw = all.password;
                    const valid = typeof pw === 'string' && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(pw);
                    setPasswordValid(!!valid);
                }}>
                    <Title level={4} style={{ textAlign: "center", color: BRAND_COLOR, marginBottom: 8 }}>
                        Reset Password
                    </Title>
                    <Paragraph style={{ textAlign: "center", color: "#666", marginBottom: 24 }}>
                        Create a strong password that’s easy to remember but hard to guess.
                    </Paragraph>
        
                    <Form.Item name="password" label="New Password" rules={[{ required: true, message: "Please enter a new password" }, { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/, message: "Use 8+ chars incl. A-Z, a-z, 0-9, symbol" }]} hasFeedback>
                        <Input.Password placeholder="Enter new password" style={{ borderRadius: 8 }} />
                    </Form.Item>
        
                    <Form.Item name="confirm" label="Confirm Password" dependencies={["password"]} hasFeedback rules={[{ required: true, message: "Please confirm your password" }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue("password") === value) { return Promise.resolve(); } return Promise.reject("Passwords do not match"); }, }), ]}>
                        <Input.Password placeholder="Re-enter password" style={{ borderRadius: 8 }} />
                    </Form.Item>
        
                    <Button type="primary" htmlType="submit" block disabled={!passwordValid} style={{ backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR, borderRadius: 8, fontWeight: 500 }}>
                        Reset Password
                    </Button>
                </Form>
            );
        
            // --- Render Modal ---
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
                        <Stepper
                            current={stepperCurrent}
                            onStepChange={(s) => {
                                // prevent user-driven changes; only allow programmatic changes
                                setStepperCurrent(s);
                            }}
                            disableStepIndicators={true}
                            footerClassName="no-footer"
                            stepCircleContainerClassName="custom-stepper-container"
                            contentClassName="custom-step-content"
                            style={{ maxWidth: 360, margin: 'auto' }}
                        >
                            <Step>{renderEmailStep()}</Step>
                            <Step>{renderOTPStep()}</Step>
                            <Step>{renderResetStep()}</Step>
                        </Stepper>
                    </div>
                </Modal>
            );
        }
