import { Alert } from "antd";
import { WarningOutlined } from "@ant-design/icons";

export default function ApiBanner({ status }) {
    if (status !== "starting") return null; // only show when backend is waking up

    return (
        <div style={{
            position: "fixed",
            top: 80,
            left: 0,
            width: "100%",
            height: "40px",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none", // lets clicks pass through if needed
        }}>
            <Alert
                message={
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <WarningOutlined />
                        Server is waking up... this may take a few seconds.
                    </span>
                }
                type="warning"
                showIcon
                style={{
                    width: "100%",
                    maxWidth: "1200px",
                    height: "50px",
                    pointerEvents: "auto", // make the alert itself interactive
                }}
            />
        </div>
    );
}
