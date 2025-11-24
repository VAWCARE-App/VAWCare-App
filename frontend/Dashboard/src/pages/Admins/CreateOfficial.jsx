// src/pages/admin/CreateOfficial.jsx
import React, { useMemo, useState } from "react";
import {
  Layout,
  Card,
  Form,
  Input,
  Button,
  Select,
  Typography,
  App as AntApp,
  Row,
  Col,
  Avatar,
  Upload,
  Tag,
  Divider,
  Modal,
  Grid,
  Progress,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
  SafetyOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function CreateOfficial() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();

  // --- Brand & surfaces
  const BRAND = {
    violet: "#6e56f6",
    violetDeep: "#4e38e6",
    pageBg: "linear-gradient(180deg, #f6f4ff 0%, #f9f7ff 60%, #ffffff 100%)",
    softBorder: "rgba(110,86,246,0.20)",
    glass: "linear-gradient(145deg, rgba(255,255,255,0.72), rgba(255,255,255,0.48))",
  };
  const glassCard = {
    borderRadius: 18,
    background: BRAND.glass,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${BRAND.softBorder}`,
    boxShadow: "0 14px 28px rgba(16,24,40,0.06)",
  };

  const [avatar, setAvatar] = useState(null);
  const [photoMimeType, setPhotoMimeType] = useState(null);
  const password = Form.useWatch("password", form);

  const strength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s += 25;
    if (/[A-Z]/.test(password)) s += 20;
    if (/[a-z]/.test(password)) s += 15;
    if (/\d/.test(password)) s += 20;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) s += 20;
    return Math.min(100, s);
  }, [password]);
  const strengthColor =
    strength < 40 ? "#ff7875" : strength < 70 ? "#faad14" : BRAND.violet;

  const generateOfficialID = () => {
    const r = Math.floor(100 + Math.random() * 900);
    form.setFieldsValue({ officialID: `OFB${r}` });
  };

  const onFinish = async (values) => {
    try {
      const payload = {
        officialID: values.officialID,
        officialEmail: values.email,
        officialPassword: values.password,
        firstName: values.firstName,
        middleInitial: values.middleInitial || undefined,
        lastName: values.lastName,
        position: values.position,
        contactNumber: values.contactNumber,
        barangay: values.barangay,
        city: values.city,
        province: values.province,
        photoData: avatar || undefined,
        photoMimeType: photoMimeType || undefined,
      };

      const res = await api.post("/api/officials/register", payload);
      console.debug("CreateOfficial response:", res);

      if (res?.status === 201 || res?.data?.success) {
        const serverMsg = res?.data?.message || "Official created successfully.";
        message.success(serverMsg);
        // Show a prominent modal confirmation as well
        Modal.success({
          title: "Official Created",
          content: (
            <div>
              <p>{serverMsg}</p>
              <p style={{ marginBottom: 0 }}>
                Account is pending approval. The official will be able to log in once approved.
              </p>
            </div>
          ),
        });
        form.resetFields();
        setAvatar(null);
        setPhotoMimeType(null);
      } else throw new Error(res?.data?.message || "Failed to create official");
    } catch (err) {
      const serverMsg =
        err.response?.data?.message || err.message || "Error creating official";
      message.error(serverMsg);
    }
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("Please upload an image file");
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
      setPhotoMimeType(file.type);
    };
    reader.readAsDataURL(file);
    return Upload.LIST_IGNORE;
  };

  return (
    <Layout style={{ minHeight: "100vh", background: BRAND.pageBg }}>
      {/* Header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: BRAND.pageBg,
          borderBottom: `1px solid ${BRAND.softBorder}`,
          display: "flex",
          alignItems: "center",
          paddingInline: screens.md ? 20 : 12,
          height: screens.xs && !screens.sm ? 64 : 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          {/* Sidebar toggle visible on small devices — matching UserManagement design */}
          {!screens.md && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
              aria-label="Toggle sidebar"
              style={{
                width: screens.md ? 40 : 36,
                height: screens.md ? 40 : 36,
                minWidth: screens.md ? 40 : 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: "#ffffffcc",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                padding: 0,
                fontSize: 18,
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              Create Barangay Official
            </Title>
            {screens.md && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Register new barangay officials with their account details and credentials.
              </Text>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<CloseOutlined />}
            onClick={() => {
              form.resetFields();
              setAvatar(null);
              setPhotoMimeType(null);
            }}
          >
            {screens.md ? "Cancel" : null}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            style={{ background: BRAND.violet, borderColor: BRAND.violet }}
          >
            {screens.md ? "Save Changes" : null}
          </Button>
        </div>
      </Header>

      <Content
        style={{
          padding: screens.md ? 24 : 12,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 980 }}>
          <Card style={{ ...glassCard, padding: 24 }}>
            {/* Section Header */}
            <div style={{ marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>
                General Information
              </Title>
              <Text type="secondary">
                Create a barangay official account. Fields marked * are required.
              </Text>
            </div>

            {/* Profile upload */}
            <Divider />
            <Row gutter={[16, 16]} align="middle">
              <Col flex="none">
                <Avatar
                  size={72}
                  src={avatar || undefined}
                  icon={<UserOutlined />}
                  style={{
                    background: "rgba(110,86,246,0.18)",
                    color: BRAND.violet,
                  }}
                />
              </Col>
              <Col flex="auto">
                <Text strong>Profile picture</Text>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Upload beforeUpload={beforeUpload} showUploadList={false}>
                    <Button icon={<UploadOutlined />}>Upload New Photo</Button>
                  </Upload>
                  {avatar && (
                    <Button
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => {
                        setAvatar(null);
                        setPhotoMimeType(null);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </Col>
            </Row>

            <Divider />

            {/* Form */}
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              style={{ marginTop: 6 }}
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Email*"
                    rules={[{ type: "email", required: true }]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="official@email.com" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Official ID*" required>
                    <Input.Group compact>
                      <Form.Item
                        name="officialID"
                        noStyle
                        rules={[{ required: true, message: "Official ID is required" }]}
                      >
                        <Input
                          prefix={<IdcardOutlined />}
                          placeholder="e.g. OFB001"
                          style={{ width: "calc(100% - 132px)" }}
                        />
                      </Form.Item>
                      <Tooltip title="Generate ID">
                        <Button onClick={generateOfficialID} style={{ width: 132 }}>
                          Generate
                        </Button>
                      </Tooltip>
                    </Input.Group>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="position"
                    label="Position*"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Select">
                      <Option value="Barangay Captain">Barangay Captain</Option>
                      <Option value="Kagawad">Kagawad</Option>
                      <Option value="Secretary">Secretary</Option>
                      <Option value="Treasurer">Treasurer</Option>
                      <Option value="SK Chairman">SK Chairman</Option>
                      <Option value="Chief Tanod">Chief Tanod</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="contactNumber"
                    label="Contact Number*"
                    rules={[
                      { required: true, message: "Contact number is required" },
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.reject();
                          const phPattern = /^(\+63|0)[0-9]{10}$/;
                          return phPattern.test(value)
                            ? Promise.resolve()
                            : Promise.reject(
                                "Please enter a valid Philippine phone number"
                              );
                        },
                      },
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="09171234567 or +63917..." />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="firstName"
                    label="First name*"
                    rules={[{ required: true }]}
                  >
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="middleInitial" label="Middle initial">
                    <Input maxLength={1} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="lastName"
                    label="Last name*"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="barangay" label="Barangay / Unit*" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="city" label="City / Municipality">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="province" label="Province">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="password"
                    label="Password*"
                    rules={[
                      { required: true, message: "Password is required" },
                      { min: 8, message: "Password must be at least 8 characters" },
                      {
                        pattern:
                          /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
                        message:
                          "Password must contain uppercase, lowercase, number and special character",
                      },
                    ]}
                  >
                    <Input.Password prefix={<SafetyOutlined />} />
                  </Form.Item>
                  <Progress percent={strength} showInfo={false} strokeColor={strengthColor} />
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Confirm Password*"
                    dependencies={["password"]}
                    rules={[
                      { required: true, message: "Please confirm the password" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error("The two passwords that you entered do not match!")
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </div>
      </Content>

      {/* Styles */}
      <style>{`
        /* Remove button and icon outlines */
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        .ant-btn-icon-only:focus,
        .ant-btn-icon-only:active,
        button:focus,
        button:active,
        .anticon:focus,
        .anticon:active {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </Layout>
  );
}
