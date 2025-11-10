import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import HardBreak from '@tiptap/extension-hard-break';
import CodeBlock from '@tiptap/extension-code-block';
import { Button } from '@/components/ui/button';
import { Bold as BoldIcon, Italic as ItalicIcon, RemoveFormatting, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        paragraph: false,
        hardBreak: false,
        codeBlock: false,
      }),
      Bold,
      Italic,
      Paragraph.configure({
        HTMLAttributes: {
          class: 'whitespace-pre-wrap',
        },
      }),
      HardBreak.extend({
        addKeyboardShortcuts() {
          return {
            Enter: () => this.editor.commands.setHardBreak(),
          };
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-muted p-2 rounded font-mono text-sm whitespace-pre-wrap',
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3 whitespace-pre-wrap',
        style: 'white-space: pre-wrap;',
      },
      transformPastedHTML(html) {
        return html
          .replace(/<br\s*\/?>/gi, '<br>')
          .replace(/\n/g, '<br>');
      },
      transformPastedText(text) {
        return text
          .split('\n')
          .map(line => `<p>${line || '<br>'}</p>`)
          .join('');
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border border-input rounded-md bg-background', className)}>
      <div className="border-b border-border p-2 flex gap-1">
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8 p-0"
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8 p-0"
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          className="h-8 w-8 p-0"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className="h-8 w-8 p-0"
          title="Format sebagai code/plain text"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} className="text-sm [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:min-h-[120px]" />
    </div>
  );
};

export default RichTextEditor;
