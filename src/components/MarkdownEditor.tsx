import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value?: string) => void;
  preview?: 'live' | 'edit' | 'preview';
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  preview = 'live'
}) => {
  return (
    <div className="w-full" data-color-mode="light">
      <MDEditor
        value={value}
        onChange={onChange}
        preview={preview}
        height={400}
        className="w-full"
      />
    </div>
  );
};

export default MarkdownEditor; 