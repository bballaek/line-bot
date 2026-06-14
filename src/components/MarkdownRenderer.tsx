import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownRenderer({ content, isPreview = false }: { content: string; isPreview?: boolean }) {
  const components = {
    h1: ({node, ...props}: any) => <h1 style={{ fontSize: isPreview ? 18 : 20, fontWeight: 700, marginTop: 16, marginBottom: 8, color: "#3E2723" }} {...props} />,
    h2: ({node, ...props}: any) => <h2 style={{ fontSize: isPreview ? 16 : 18, fontWeight: 700, marginTop: 14, marginBottom: 8, color: "#3E2723" }} {...props} />,
    h3: ({node, ...props}: any) => <h3 style={{ fontSize: isPreview ? 15 : 16, fontWeight: 700, marginTop: 12, marginBottom: 8, color: "#3E2723" }} {...props} />,
    p: ({node, ...props}: any) => <p style={{ fontSize: isPreview ? 13 : 14, lineHeight: isPreview ? 1.5 : 1.8, marginBottom: 8, color: "#795548" }} {...props} />,
    ul: ({node, ...props}: any) => <ul style={{ paddingLeft: 20, marginBottom: 8, listStyleType: "disc", fontSize: isPreview ? 13 : 14, color: "#795548" }} {...props} />,
    ol: ({node, ...props}: any) => <ol style={{ paddingLeft: 20, marginBottom: 8, listStyleType: "decimal", fontSize: isPreview ? 13 : 14, color: "#795548" }} {...props} />,
    li: ({node, ...props}: any) => <li style={{ marginBottom: 4 }} {...props} />,
    a: ({node, ...props}: any) => <a style={{ color: "#FFC107", textDecoration: "underline" }} target="_blank" rel="noreferrer" {...props} />,
    strong: ({node, ...props}: any) => <strong style={{ fontWeight: 700, color: "#3E2723" }} {...props} />,
    em: ({node, ...props}: any) => <em style={{ fontStyle: "italic" }} {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote style={{ borderLeft: "4px solid #D7CCC8", paddingLeft: 12, color: "#795548", margin: "8px 0", fontStyle: "italic" }} {...props} />,
    code: ({node, inline, ...props}: any) => (
      inline ? 
      <code style={{ background: "#FFF9F0", padding: "2px 6px", borderRadius: 4, fontSize: "0.9em", color: "#E53935", fontFamily: "monospace" }} {...props} /> :
      <pre style={{ background: "#FFF9F0", padding: "12px", borderRadius: 8, overflowX: "auto", fontSize: "0.9em", marginBottom: 8 }}><code style={{ color: "#5D4037", fontFamily: "monospace" }} {...props} /></pre>
    )
  };

  return (
    <div style={{ wordBreak: "break-word" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}
