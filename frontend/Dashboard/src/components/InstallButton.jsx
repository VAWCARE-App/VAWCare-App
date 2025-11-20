import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button, Modal, Radio, Typography, Space } from "antd";
import { setDisguiseMode, loadDisguiseMode } from "../hooks/useDisguise";

const { Text, Title } = Typography;

const InstallButton = forwardRef((props, ref) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [disguised, setDisguised] = useState(localStorage.getItem("disguise") === "1");
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        // Load saved disguise mode
        loadDisguiseMode();
        setDisguised(localStorage.getItem("disguise") === "1");

        // Capture PWA install prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
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
            alert("Your browser does not support automatic install prompts.");
            return;
        }

        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
            console.log("User accepted the install");
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
                title="Install App"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                centered
            >
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
                        After selecting, press “Install” to add the app to your home screen.
                    </Text>

                    <Button
                        type="primary"
                        block
                        onClick={handleInstall}
                        disabled={!deferredPrompt}
                    >
                        Install App
                    </Button>

                    {!deferredPrompt && (
                        <Text type="secondary">
                            Your browser does not support automatic install prompts. You can still add it manually from your browser menu.
                        </Text>
                    )}
                </Space>
            </Modal>
        </>
    );
});

InstallButton.displayName = "InstallButton";

export default InstallButton;
