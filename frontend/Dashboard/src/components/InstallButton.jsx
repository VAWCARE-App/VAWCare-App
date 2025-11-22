import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Button, Modal, Radio, Typography, Space, Tabs, Alert } from "antd";
import {
  DesktopOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { setDisguiseMode, loadDisguiseMode } from "../hooks/useDisguise";

const { Text, Title, Paragraph } = Typography;

const InstallButton = forwardRef((props, ref) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [disguised, setDisguised] = useState(
    localStorage.getItem("disguise") === "1"
  );
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const BRAND = {
    violet: "#7A5AF8",
    pink: "#e91e63",
  };

  const getIsDark = () => {
    try {
      const root = document.documentElement;

      // If you're using data-theme on <html>
      const dataTheme = root.getAttribute("data-theme");
      if (dataTheme) {
        return dataTheme === "dark";
      }

      // If you have a "dark" class somewhere (optional, adjust selector if needed)
      if (root.classList.contains("dark")) return true;

      // Fallback: system preference
      if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  useEffect(() => {
    setIsDark(getIsDark());

    // Optional: listen for system dark mode changes
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handleMedia = (e) => setIsDark(e.matches);
    if (mq) {
      mq.addEventListener("change", handleMedia);
    }

    // If your app dispatches a custom event when toggling theme,
    // you can hook into it too (optional):
    const handleThemeChange = () => setIsDark(getIsDark());
    window.addEventListener("themechange", handleThemeChange);

    return () => {
      if (mq) mq.removeEventListener("change", handleMedia);
      window.removeEventListener("themechange", handleThemeChange);
    };
  }, []);

  // Re-evaluate theme when modal opens to avoid stale appearance
  useEffect(() => {
    if (modalVisible) setIsDark(getIsDark());
  }, [modalVisible]);

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
      alert(
        "Your browser does not support automatic install prompts. Please use the Desktop Instructions tab for manual installation steps."
      );
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

  // Themed surfaces

  // --- LIGHT THEME: much brighter, more white, less muted
  const modalBackground = isDark
    ? "radial-gradient(circle at top left, rgba(233,30,99,0.14), transparent 55%)," +
      "radial-gradient(circle at bottom right, rgba(122,90,248,0.20), transparent 55%)," +
      "#020617"
    : "radial-gradient(circle at top left, rgba(233,30,99,0.06), transparent 40%)," +
      "radial-gradient(circle at bottom right, rgba(122,90,248,0.06), transparent 40%)," +
      "linear-gradient(180deg, #ffffff 0%, #fbf8ff 100%)";

  const headerBackground = isDark
    ? "linear-gradient(135deg, rgba(233,30,99,0.18), rgba(15,23,42,0.95))"
    : "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,245,255,0.95) 60%, rgba(122,90,248,0.06) 100%)";

  const titleColor = isDark ? "#F9FAFB" : "#1a1a1a";
  const subtitleColor = isDark ? "#9CA3AF" : "#5a5a5a";

  const infoCardBg = isDark
    ? "rgba(15,23,42,0.9)"
    : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,246,255,0.98) 100%)";
  const infoCardBorder = isDark
    ? "1px solid rgba(148,163,184,0.5)"
    : "1px solid #ece7f6";

  const sectionTitleColor = isDark ? "#E5E7EB" : "#1a1a1a";
  const secondaryTextColor = isDark ? "#9CA3AF" : "#7a7a7a";

  return (
    <>
      <Button
        type="primary"
        onClick={() => setModalVisible(true)}
        icon={<DownloadOutlined />}
        style={{
          borderRadius: 999,
          paddingInline: 18,
          fontWeight: 600,
          background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.violet})`,
          border: "none",
          boxShadow: "0 12px 28px rgba(233,30,99,0.4)",
        }}
      >
        Install App
      </Button>

      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
        width={isDesktop ? 640 : 520}
        styles={{
          content: {
            borderRadius: 24,
            overflow: "hidden",
            padding: 0,
            border: isDark
              ? "1px solid rgba(148,163,184,0.5)"
              : "1px solid #ece7f6",
            boxShadow: isDark
              ? "0 24px 80px rgba(0,0,0,0.75)"
              : "0 18px 40px rgba(15,23,42,0.08)",
            backdropFilter: "blur(18px)",
            background: modalBackground,
          },
          header: {
            padding: "18px 24px 10px",
            borderBottom: "none",
            background: headerBackground,
          },
          body: {
            padding: "10px 24px 22px",
            maxHeight: "80vh",
            overflowY: "auto",
          },
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isDark
                  ? "linear-gradient(135deg, rgba(233,30,99,0.35), rgba(15,23,42,0.95))"
                  : "linear-gradient(135deg, rgba(255,243,249,0.9), rgba(243,240,255,0.9))",
                boxShadow: isDark
                  ? "0 12px 30px rgba(15,23,42,0.6)"
                  : "0 8px 24px rgba(122,90,248,0.08)",
              }}
            >
              <MobileOutlined style={{ fontSize: 22, color: isDark ? "#ffffff" : "#6b21a8" }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  color: titleColor,
                }}
              >
                Install VAWCare App
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: subtitleColor,
                  marginTop: 2,
                }}
              >
                Add VAWCare to your device for quicker, safer access.
              </div>
            </div>
          </div>
        }
      >
        {/* Custom scrollbar styles for modal body */}
        <style>{`
          .ant-modal-body {
            scrollbar-width: thin;
            scrollbar-color: #b791b5ff #f6f3ff;
          }
          .ant-modal-body::-webkit-scrollbar {
            width: 8px;
            background: #f6f3ff;
            border-radius: 8px;
          }
          .ant-modal-body::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #e91e63 40%, #7A5AF8 100%);
            border-radius: 8px;
            min-height: 24px;
          }
          .ant-modal-body::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #7A5AF8 40%, #e91e63 100%);
          }

          /* Dark theme overrides – assumes data-theme="dark" on <html> */
          [data-theme='dark'] .ant-modal-body {
            scrollbar-color: #4b5563 #020617;
          }
          [data-theme='dark'] .ant-modal-body::-webkit-scrollbar {
            background: #020617;
          }
          [data-theme='dark'] .ant-modal-body::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #e91e63 40%, #7A5AF8 100%);
          }
        `}</style>

        <Tabs
          tabBarGutter={24}
          items={[
            {
              key: "install",
              label: (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: isDark ? "#E5E7EB" : undefined,
                  }}
                >
                  <MobileOutlined />
                  <span>Installation</span>
                </span>
              ),
              children: (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: infoCardBg,
                      border: infoCardBorder,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isDark
                            ? "linear-gradient(135deg, rgba(233,30,99,0.5), rgba(122,90,248,0.8))"
                            : "linear-gradient(135deg, rgba(255,244,249,0.95), rgba(245,242,255,0.95))",
                          boxShadow: isDark ? undefined : "0 6px 18px rgba(122,90,248,0.06)",
                        }}
                      >
                        <SafetyCertificateOutlined
                          style={{ fontSize: 16, color: isDark ? "#ffffff" : "#6b21a8" }}
                        />
                      </div>
                      <Title
                        level={5}
                        style={{
                          margin: 0,
                          color: sectionTitleColor,
                        }}
                      >
                        Choose how the app looks:
                      </Title>
                    </div>

                    <Radio.Group
                      onChange={handleAppearanceChange}
                      value={disguised ? "calculator" : "real"}
                    >
                      <Space direction="vertical">
                        <Radio value="real">
                          <Text strong style={{ color: sectionTitleColor }}>
                            VAWCare (Original)
                          </Text>
                          <br />
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 12,
                              color: secondaryTextColor,
                            }}
                          >
                            Shows full branding, icons, and labels for easier navigation.
                          </Text>
                        </Radio>
                        <Radio value="calculator">
                          <Text strong style={{ color: sectionTitleColor }}>
                            Calculator (Disguise)
                          </Text>
                          <br />
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 12,
                              color: secondaryTextColor,
                            }}
                          >
                            Appears as a simple calculator icon for extra privacy and
                            safety.
                          </Text>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </div>

                  <Text
                    type="secondary"
                    style={{
                      fontSize: 13.5,
                      color: secondaryTextColor,
                    }}
                  >
                    After selecting, press <b>&quot;Install App&quot;</b> to add
                    VAWCare to your home screen.
                  </Text>

                  <Button
                    type="primary"
                    block
                    onClick={handleInstall}
                    disabled={!deferredPrompt}
                    icon={<DownloadOutlined />}
                    style={{
                      borderRadius: 999,
                      fontWeight: 600,
                      paddingBlock: 10,
                      background: deferredPrompt
                        ? `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.violet})`
                        : isDark
                        ? "#4B5563"
                        : "linear-gradient(90deg, #ffffff 0%, #f6f4ff 100%)",
                      border: "none",
                          boxShadow: deferredPrompt
                            ? "0 14px 30px rgba(233,30,99,0.45)"
                            : "0 8px 20px rgba(122,90,248,0.06)",
                    }}
                  >
                    Install App
                  </Button>

                  {isInstalled ? (
                    <Alert
                      message={
                        <>
                          <CheckCircleOutlined style={{ marginRight: 6 }} />
                          App Already Installed
                        </>
                      }
                      description="VAWCare is already installed on your device! You can find it on your home screen or app drawer."
                      type="success"
                      showIcon
                      style={{
                        borderRadius: 12,
                        border: "1px solid rgba(34,197,94,0.25)",
                      }}
                    />
                  ) : !deferredPrompt ? (
                    <Alert
                      message="Install Prompt Not Available"
                      description={
                        isDesktop
                          ? "Your browser doesn't support the automatic install prompt on desktop. See the 'Desktop Instructions' tab for alternative methods."
                          : "Your browser doesn't support automatic install prompts. Try using a modern mobile browser or check the Desktop Instructions."
                      }
                      type="info"
                      showIcon
                      style={{
                        borderRadius: 12,
                        border: "1px solid rgba(59,130,246,0.25)",
                      }}
                    />
                  ) : null}
                </Space>
              ),
            },
            {
              key: "desktop",
              label: (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: isDark ? "#E5E7EB" : undefined,
                  }}
                >
                  <DesktopOutlined />
                  <span>Desktop Instructions</span>
                </span>
              ),
              children: (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Paragraph
                    style={{
                      marginBottom: 4,
                      color: sectionTitleColor,
                    }}
                  >
                    <strong>
                      Desktop browsers don't support PWA installation the same way as
                      mobile.
                    </strong>{" "}
                    Here are your options:
                  </Paragraph>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: infoCardBg,
                      border: infoCardBorder,
                    }}
                  >
                    <Title
                      level={5}
                      style={{ marginTop: 0, color: sectionTitleColor }}
                    >
                      Option 1: Chrome / Edge (Recommended)
                    </Title>
                    <ol
                      style={{
                        paddingLeft: 20,
                        lineHeight: 1.8,
                        marginBottom: 0,
                        color: secondaryTextColor || undefined,
                      }}
                    >
                      <li>
                        Click the <strong>address bar menu (⋮)</strong> in the
                        top-right corner
                      </li>
                      <li>
                        Select <strong>&quot;Install app&quot;</strong> or{" "}
                        <strong>&quot;Create shortcut&quot;</strong>
                      </li>
                      <li>
                        Choose your preferred appearance (Original or Disguise)
                      </li>
                      <li>The app will be added to your desktop or start menu</li>
                    </ol>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: infoCardBg,
                      border: infoCardBorder,
                    }}
                  >
                    <Title
                      level={5}
                      style={{ marginTop: 0, color: sectionTitleColor }}
                    >
                      Option 2: Firefox
                    </Title>
                    <ol
                      style={{
                        paddingLeft: 20,
                        lineHeight: 1.8,
                        marginBottom: 0,
                        color: secondaryTextColor || undefined,
                      }}
                    >
                      <li>
                        Click the <strong>menu button (≡)</strong> in the top-right
                      </li>
                      <li>
                        Select <strong>&quot;More tools&quot; → &quot;Create Shortcut&quot;</strong>
                      </li>
                      <li>Choose where to save and confirm</li>
                    </ol>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: infoCardBg,
                      border: infoCardBorder,
                    }}
                  >
                    <Title
                      level={5}
                      style={{ marginTop: 0, color: sectionTitleColor }}
                    >
                      Option 3: Safari (Mac)
                    </Title>
                    <ol
                      style={{
                        paddingLeft: 20,
                        lineHeight: 1.8,
                        marginBottom: 0,
                        color: secondaryTextColor || undefined,
                      }}
                    >
                      <li>
                        Click <strong>&quot;File&quot;</strong> in the menu bar
                      </li>
                      <li>
                        Select <strong>&quot;Add to Dock&quot;</strong>
                      </li>
                      <li>Your app will appear in the dock</li>
                    </ol>
                  </div>

                  <Alert
                    message="Mobile Recommended"
                    description="For the best experience, install VAWCare on your mobile device using Chrome, Firefox, or Safari. Mobile installation is smoother and the app works offline better."
                    type="warning"
                    showIcon
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(251,191,36,0.4)",
                    }}
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
