"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import type QuillType from "quill";

interface QuillEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export interface QuillEditorHandle {
  getContent: () => string;
  setContent: (content: string) => void;
}

const QuillEditor = forwardRef<QuillEditorHandle, QuillEditorProps>(
  ({ value = "", onChange, placeholder, className = "" }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillInstanceRef = useRef<QuillType | null>(null);
    const onChangeRef = useRef(onChange);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    useEffect(() => {
      if (!isMounted || !editorRef.current || typeof window === "undefined")
        return;

      let quillInstance: QuillType | null = null;

      const initQuill = async () => {
        try {
          // Dynamically import Quill CSS and library only on client side
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await import("quill/dist/quill.snow.css");
          const { default: Quill } = await import("quill");

          if (!editorRef.current) return;

          const quill = new Quill(editorRef.current, {
            theme: "snow",
            placeholder: placeholder || "Write your email message here...",
            modules: {
              toolbar: [
                [{ header: [1, 2, false] }],
                ["bold", "italic", "underline"],
                [{ color: [] }, { background: [] }],
                [{ align: [] }],
                ["link", "image"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["clean"],
              ],
            },
          });

          if (value) {
            quill.root.innerHTML = value;
          }

          quill.on("text-change", () => {
            const html = quill.root.innerHTML;
            if (onChangeRef.current) {
              onChangeRef.current(html);
            }
          });

          quillInstanceRef.current = quill;
          quillInstance = quill;
        } catch (error) {
          console.error("Failed to initialize Quill:", error);
        }
      };

      initQuill();

      return () => {
        if (quillInstance) {
          quillInstanceRef.current = null;
          quillInstance = null;
        }
      };
    }, [isMounted, placeholder]);

    useEffect(() => {
      if (quillInstanceRef.current && value !== undefined) {
        const currentContent = quillInstanceRef.current.root.innerHTML;
        if (currentContent !== value) {
          quillInstanceRef.current.root.innerHTML = value;
        }
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      getContent: () => {
        return quillInstanceRef.current?.root.innerHTML || "";
      },
      setContent: (content: string) => {
        if (quillInstanceRef.current) {
          quillInstanceRef.current.root.innerHTML = content;
        }
      },
    }));

    if (!isMounted) {
      return (
        <div className={`quill-editor-wrapper ${className}`}>
          <div className="min-h-[300px] border border-gray-200 rounded-md flex items-center justify-center">
            <p className="text-gray-400 text-sm">Loading editor...</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <style>{`
          .quill-editor-wrapper .ql-container {
            font-size: 14px;
            font-family: inherit;
            min-height: 300px;
          }
          .quill-editor-wrapper .ql-editor {
            min-height: 300px;
          }
          .quill-editor-wrapper .ql-editor.ql-blank::before {
            color: #9ca3af;
            font-style: normal;
          }
        `}</style>
        <div className={`quill-editor-wrapper ${className}`}>
          <div ref={editorRef} className="min-h-[300px]" />
        </div>
      </>
    );
  }
);

QuillEditor.displayName = "QuillEditor";

export default QuillEditor;
