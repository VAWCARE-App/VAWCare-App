import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button, Modal, Radio, Typography, Space, Tabs, Alert } from "antd";
import { DesktopOutlined, MobileOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { setDisguiseMode, loadDisguiseMode } from "../hooks/useDisguise";

const { Text, Title, Paragraph } = Typography;

const InstallButton = forwardRef((props, ref) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [disguised, setDisguised] = useState(localStorage.getItem("disguise") === "1");
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Load saved disguise mode
        loadDisguiseMode();
        setDisguised(localStorage.getItem("disguise") === "1");

        // Check if app is already installed
        const checkInstalled = async () => {
            if (window.navigator.getInstalledRelatedApps) {
                const apps = await window.navigator.getInstalledRelatedApps();
                setIsInstalled(apps.length > 0);
            }
        };
        checkInstalled();

        // Capture PWA install prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);

        // Detect screen size changes
        const handleResize = () => {
            setIsDesktop(window.innerWidth > 768);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        openModal: () => setModalVisible(true),
        closeModal: () => setModalVisible(false),
    }));

    const handleAppearanceChange = (e) => {
        const enabled = e.target.value === "calculator";
        setDisguiseMode(enabled);
        setDisguised(enabled);
    };

    const handleInstall = async () => {
        if (!deferredPrompt) {
            alert("Your browser does not support automatic install prompts. Please use the Desktop Instructions tab for manual installation steps.");
            return;
        }

        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
            console.log("User accepted the install");
            setIsInstalled(true);
        } else {
            console.log("User dismissed the install");
        }
        setDeferredPrompt(null);
        setModalVisible(false);
    };

    return (
        <>
            <Button type="primary" onClick={() => setModalVisible(true)}>
                Install App
            </Button>

            <Modal
                title="Install VAWCare App"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                centered
                width={600}
            >
                <Tabs
                    items={[
                        {
                            key: "install",
                            label: (
                                <span>
                                    <MobileOutlined /> Installation
                                </span>
                            ),
                            children: (
                                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                                    <div>
                                        <Title level={5}>Choose how the app looks:</Title>
                                        <Radio.Group
                                            onChange={handleAppearanceChange}
                                            value={disguised ? "calculator" : "real"}
                                        >
                                            <Space direction="vertical">
                                                <Radio value="real">VAWCare (Original)</Radio>
                                                <Radio value="calculator">Calculator (Disguise)</Radio>
                                            </Space>
                                        </Radio.Group>
                                    </div>

                                    <Text type="secondary">
                                        After selecting, press "Install" to add the app to your home screen.
                                    </Text>

                                    <Button
                                        type="primary"
                                        block
                                        onClick={handleInstall}
                                        disabled={!deferredPrompt}
                                    >
                                        Install App
                                    </Button>

                                    {isInstalled ? (
                                        <Alert
                                            message={<><CheckCircleOutlined /> App Already Installed</>}
                                            description="VAWCare is already installed on your device! You can find it on your home screen or app drawer."
                                            type="success"
                                            showIcon
                                        />
                                    ) : !deferredPrompt ? (
                                        <Alert
                                            message="Install Prompt Not Available"
                                            description={
                                                isDesktop
                                                    ? "Your browser doesn't support the automatic install prompt on desktop. See 'Desktop Instructions' tab for alternative methods."
                                                    : "Your browser doesn't support automatic install prompts. Try using a modern mobile browser or check the Desktop Instructions."
                                            }
                                            type="info"
                                            showIcon
                                        />
                                    ) : null}
                                </Space>
                            ),
                        },
                        {
                            key: "desktop",
                            label: (
                                <span>
                                    <DesktopOutlined /> Desktop Instructions
                                </span>
                            ),
                            children: (
                                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                                    <Paragraph>
                                        <strong>Desktop browsers don't support PWA installation the same way as mobile.</strong> Here are your options:
                                    </Paragraph>

                                    <div>
                                        <Title level={5}>Option 1: Chrome / Edge (Recommended)</Title>
                                        <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                                            <li>Click the <strong>address bar menu (⋮)</strong> in the top-right corner</li>
                                            <li>Select <strong>"Install app"</strong> or <strong>"Create shortcut"</strong></li>
                                            <li>Choose your preferred appearance (Original or Disguise)</li>
                                            <li>The app will be added to your desktop or start menu</li>
                                        </ol>
                                    </div>

                                    <div>
                                        <Title level={5}>Option 2: Firefox</Title>
                                        <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                                            <li>Click the <strong>menu button (≡)</strong> in the top-right</li>
                                            <li>Select <strong>"More tools" → "Create Shortcut"</strong></li>
                                            <li>Choose where to save and confirm</li>
                                        </ol>
                                    </div>

                                    <div>
                                        <Title level={5}>Option 3: Safari (Mac)</Title>
                                        <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                                            <li>Click <strong>"File"</strong> in the menu bar</li>
                                            <li>Select <strong>"Add to Dock"</strong></li>
                                            <li>Your app will appear in the dock</li>
                                        </ol>
                                    </div>

                                    <Alert
                                        message="Mobile Recommended"
                                        description="For the best experience, install VAWCare on your mobile device using Chrome, Firefox, or Safari. Mobile installation is smoother and the app works offline better."
                                        type="warning"
                                        showIcon
                                    />
                                </Space>
                            ),
                        },
                    ]}
                />
            </Modal>
        </>
    );
});

InstallButton.displayName = "InstallButton";

export default InstallButton;

