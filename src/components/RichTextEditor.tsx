import React, { useEffect } from 'react';
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
import { toast } from '@/components/ui/use-toast';

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
      Bold.configure({
        HTMLAttributes: {
          class: 'font-bold',
        },
      }),
      Italic.configure({
        HTMLAttributes: {
          class: 'italic',
        },
      }),
      Paragraph.configure({
        HTMLAttributes: {
          class: 'my-1',
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
          class: 'bg-muted p-2 rounded my-2 font-mono text-sm',
        },
      }),
    ],
    content: value || '<p><br></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-3',
      },
      transformPastedHTML(html) {
        return html
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>\s*<p>/gi, '\n\n')
          .replace(/<\/div>\s*<div[^>]*>/gi, '\n')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<[^>]*>/g, '')
          .replace(/\n/g, '<br>');
      },
      transformPastedText(text) {
        const unescaped = text
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/\r\n?/g, '\n');

        const asPlain = unescaped
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>\s*<p>/gi, '\n\n')
          .replace(/<\/div>\s*<div[^>]*>/gi, '\n')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<[^>]*>/g, '');

        return asPlain;
      },
    },
  });

  useEffect(() => {
    if (editor && typeof value === 'string') {
      const current = editor.getHTML();
      if (value !== current) {
        editor.commands.setContent(value || '<p><br></p>');
      }
    }
  }, [value, editor]);

  const copyAsPlainText = () => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const slice = editor.state.doc.slice(from, to, true);
    const plainText = serializeSliceToPlain(slice);
    
    navigator.clipboard.writeText(plainText).then(() => {
      toast({
        title: "Berhasil",
        description: "Teks berhasil disalin sebagai plain text",
      });
    });
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
