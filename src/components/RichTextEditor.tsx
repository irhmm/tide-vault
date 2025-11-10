import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import HardBreak from '@tiptap/extension-hard-break';
import CodeBlock from '@tiptap/extension-code-block';
import { Button } from '@/components/ui/button';
import { Bold as BoldIcon, Italic as ItalicIcon, RemoveFormatting, Code, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Helper function to serialize editor content to plain text
const serializeSliceToPlain = (slice: any): string => {
  const lines: string[] = [];
  
  const processParagraph = (node: any) => {
    let line = '';
    node?.content?.forEach((child: any) => {
      if (child.isText) {
        line += child.text;
      } else if (child.type?.name === 'hardBreak') {
        lines.push(line);
        line = '';
      }
    });
    lines.push(line);
  };

  const processCodeBlock = (node: any) => {
    let code = '';
    node?.content?.forEach((child: any) => {
      if (child.isText) code += child.text;
    });
    code.split('\n').forEach((l) => lines.push(l));
  };

  const content = slice?.content;
  let firstBlock = true;
  
  const processNodes = (nodes: any) => {
    if (!nodes) return;
    
    const nodeArray = Array.isArray(nodes) ? nodes : nodes.content || [nodes];
    nodeArray.forEach((node: any) => {
      if (!firstBlock && lines.length > 0 && lines[lines.length - 1] !== '') {
        lines.push('');
      }
      firstBlock = false;

      if (node.type?.name === 'paragraph') {
        processParagraph(node);
      } else if (node.type?.name === 'codeBlock') {
        processCodeBlock(node);
      }
    });
  };

  processNodes(content);
  
  // Remove trailing empty lines
  while (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }
  
  return lines.join('\n');
};

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
      handleDOMEvents: {
        copy: (view, event) => {
          try {
            const slice = view.state.selection.content();
            const text = serializeSliceToPlain(slice);
            event.clipboardData?.setData('text/plain', text);
            event.preventDefault();
            return true;
          } catch (e) {
            return false;
          }
        },
        cut: (view, event) => {
          try {
            const slice = view.state.selection.content();
            const text = serializeSliceToPlain(slice);
            event.clipboardData?.setData('text/plain', text);
            event.preventDefault();
            view.dispatch(view.state.tr.deleteSelection());
            return true;
          } catch (e) {
            return false;
          }
        },
      },
      clipboardTextSerializer: (slice) => {
        return serializeSliceToPlain(slice);
      },
      transformPastedHTML(html) {
        // Clean up HTML but preserve structure
        return html
          .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newline
          .replace(/<\/p>\s*<p>/gi, '\n\n') // Convert paragraph breaks to double newline
          .replace(/<[^>]*>/g, '') // Remove all other HTML tags
          .replace(/\n/g, '<br>'); // Convert newlines back to <br>
      },
      transformPastedText(text) {
        // Step 1: Strip any HTML tags that might be in the pasted text
        // This prevents literal <p>, <br>, etc from showing up
        const cleanText = text
          .replace(/<[^>]*>/g, '') // Remove all HTML tags
          .replace(/&nbsp;/g, ' ') // Replace &nbsp; with regular space
          .replace(/&lt;/g, '<')   // Unescape HTML entities if any
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
        
        // Step 2: Convert natural line breaks to proper HTML structure
        // Double line break = new paragraph, single = <br>
        const paragraphs = cleanText.split(/\n\n+/);
        return paragraphs
          .map(para => {
            const lines = para.split('\n').filter(line => line.trim());
            if (lines.length === 0) return '<p><br></p>';
            return `<p>${lines.join('<br>')}</p>`;
          })
          .join('');
      },
    },
  });

  const copyAsPlainText = async () => {
    if (!editor) return;
    
    try {
      const { state } = editor;
      const { from, to } = state.selection;
      let plainText = '';
      
      if (from !== to) {
        plainText = state.doc.textBetween(from, to, '\n');
      } else {
        const allSlice = { content: state.doc.content };
        plainText = serializeSliceToPlain(allSlice);
      }
      
      await navigator.clipboard.writeText(plainText);
      console.log('Text copied to clipboard as plain text');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
        <div className="border-l border-border ml-1 pl-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copyAsPlainText}
            className="h-8 w-8 p-0"
            title="Copy as plain text (tanpa formatting)"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <EditorContent editor={editor} className="text-sm [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:min-h-[120px]" />
    </div>
  );
};

export default RichTextEditor;
