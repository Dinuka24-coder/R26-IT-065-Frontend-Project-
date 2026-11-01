import { useTheme } from "../../context/ThemeContext";

/** Wraps a <Table>: row hover, one-line cells, sideways scroll on small screens */
export default function TableFrame({ children }) {
    const { t } = useTheme();
    return (
        <div className="pulmo-table" style={{ overflowX: "auto", margin: "0 -4px", padding: "0 4px" }}>
            <style>{`
        .pulmo-table th, .pulmo-table td { white-space: nowrap; }
        .pulmo-table tbody tr { transition: background .12s; }
        .pulmo-table tbody tr:hover { background: ${t.accentSoft}; }
      `}</style>
            {children}
        </div>
    );
}