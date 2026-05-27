import ProrationCalculator from "./ProrationCalculator";

function ToolsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Tools</h2>
      </div>
      <div className="tools-grid">
        <ProrationCalculator />
      </div>
    </div>
  );
}

export default ToolsPage;
