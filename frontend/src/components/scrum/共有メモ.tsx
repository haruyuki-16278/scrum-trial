import { useRef, useEffect, useState, useMemo } from 'react';
import * as Y from 'yjs';
import { 
  MDXEditor, 
  headingsPlugin, 
  listsPlugin, 
  quotePlugin, 
  thematicBreakPlugin, 
  markdownShortcutPlugin,
  type MDXEditorMethods
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import '../../mdx-editor-dark.css';
import { useYjsコラボレーション, Yjsプラグイン, YjsContext } from '../../plugins/Yjsプラグイン';

const 色取得 = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = hash & 0x00FFFFFF;
    return `#${('00000' + c.toString(16)).toUpperCase().substr(-6)}`;
}

interface 共有メモProps {
    セッションID: string;
    メンバー名: string;
    自身のメンバーID: string | null;
    読み取り専用: boolean;
}

import diff from 'fast-diff';

// Convert Lexical's XmlText structure to Markdown
// This is needed for legacy data stored via @lexical/yjs
function convertLexicalXmlTextToMarkdown(xmlText: any): string {
    interface Element {
        type: string;
        tag?: string;
        content?: string;
        children?: Element[];
        attrs?: Record<string, any>;
    }
    
    // Recursively extract elements from XmlText
    function extractElements(xt: any): Element[] {
        const elements: Element[] = [];
        let item = xt._start;
        while (item) {
            if (!item.deleted && item.content) {
                const c = item.content;
                // Use property-based detection for minification compatibility
                if ('str' in c) {
                    // ContentString - has 'str' property
                    elements.push({ type: 'text', content: c.str });
                } else if ('type' in c && c.type && c.type.getAttributes) {
                    // ContentType with YXmlText - has 'type' property with getAttributes
                    const nested = c.type;
                    const attrs = nested.getAttributes();
                    const children = extractElements(nested);
                    elements.push({ 
                        type: attrs.__type || 'unknown',
                        tag: attrs.__tag,
                        children,
                        attrs
                    });
                }
            }
            item = item.right;
        }
        return elements;
    }
    
    // Convert elements to Markdown
    function elementsToMarkdown(elements: Element[]): string {
        let result = '';
        for (const el of elements) {
            if (el.type === 'text') {
                result += el.content || '';
            } else if (el.type === 'heading') {
                const tag = el.tag || 'h2';
                const level = parseInt(tag.replace('h', '')) || 2;
                const text = elementsToMarkdown(el.children || []);
                result += '#'.repeat(level) + ' ' + text.trim() + '\n\n';
            } else if (el.type === 'paragraph') {
                const text = elementsToMarkdown(el.children || []);
                if (text.trim()) {
                    result += text.trim() + '\n\n';
                }
            } else if (el.type === 'list') {
                result += elementsToMarkdown(el.children || []) + '\n';
            } else if (el.type === 'listitem') {
                const text = elementsToMarkdown(el.children || []);
                result += '* ' + text.trim() + '\n';
            } else {
                result += elementsToMarkdown(el.children || []);
            }
        }
        return result;
    }
    
    const elements = extractElements(xmlText);
    return elementsToMarkdown(elements);
}

export function 共有メモ({ セッションID, メンバー名, 自身のメンバーID, 読み取り専用 }: 共有メモProps) {
    const エディタ参照 = useRef<MDXEditorMethods>(null);
    const 自分の色 = 色取得(自身のメンバーID || メンバー名 || 'user');
    
    // Yjs設定
    const Yjs設定 = useYjsコラボレーション(セッションID, メンバー名, 自分の色);
    const [同期済み, 同期済み設定] = useState(false);
    const [markdown, setMarkdown] = useState('');
    const lastMarkdownRef = useRef('');

    // Sync Logic
    useEffect(() => {
        const { ydoc } = Yjs設定;
        if (!ydoc) return;

        const yText = ydoc.getText('markdown');
        
        // Initial Load
        const initialText = yText.toString();
        setMarkdown(initialText);
        lastMarkdownRef.current = initialText;

        // Migration from backup
        if (initialText.length === 0) {
            const backup = ydoc.getText('backup_content');
            if (backup.length > 0) {

                yText.insert(0, backup.toString());
            }
        }

        const observer = (event: any, transaction: any) => {
            if (transaction.origin === 'local') return;
            const newText = yText.toString();

            setMarkdown(newText);
            lastMarkdownRef.current = newText;
            // Use the API to update the editor content
            if (エディタ参照.current) {
                エディタ参照.current.setMarkdown(newText);
            }
        };
        
        yText.observe(observer);

        // Status Check
        const 状態確認 = () => {
             const debug = (window as any).debugYjs;
             if (debug?.provider) {
                 同期済み設定(debug.provider.wsconnected);
             }
        };
        const interval = setInterval(状態確認, 500);

        return () => {
            yText.unobserve(observer);
            clearInterval(interval);
        };
    }, [Yjs設定.ydoc]);

    // REST Fallback (Read Only)
    useEffect(() => {
        if (読み取り専用 && Yjs設定.ydoc) {
             const { ydoc } = Yjs設定;
             fetch(`/api/sessions/${セッションID}/yjs-state`)
               .then(res => res.json())
               .then(data => {
                   if (data.state) {
                       const binary = Uint8Array.from(atob(data.state), c => c.charCodeAt(0));
                       Y.applyUpdate(ydoc, binary);
                       
                       // Try 'markdown' first
                       let content = ydoc.getText('markdown').toString();

                       
                       // If empty, try 'root' XmlText (legacy format from @lexical/yjs)
                        if (content.length === 0) {
                            try {
                                const rootXmlText = ydoc.get('root', Y.XmlText);
                                if (rootXmlText) {
                                    // Convert Lexical XmlText structure to Markdown
                                    content = convertLexicalXmlTextToMarkdown(rootXmlText);

                                }
                            } catch (e) {

                            }
                        }
                       
                       // If still empty, try backup_content
                       if (content.length === 0) {
                           const backup = ydoc.getText('backup_content').toString();
                           if (backup.length > 0) {
                               content = backup;

                           }
                       }
                       
                       if (content.length > 0) {
                           setMarkdown(content);
                           lastMarkdownRef.current = content;
                           if (エディタ参照.current) {
                               エディタ参照.current.setMarkdown(content);
                           }
                       }
                       同期済み設定(true);
                   }
               });
        }
    }, [読み取り専用, セッションID, Yjs設定.ydoc]);

    const handleMarkdownChange = (newMarkdown: string) => {
        setMarkdown(newMarkdown);
        lastMarkdownRef.current = newMarkdown;
        
        const { ydoc } = Yjs設定;
        if (!ydoc || 読み取り専用) return;

        const yText = ydoc.getText('markdown');
        const currentYText = yText.toString();
        
        if (newMarkdown === currentYText) return;

        // Diff and Apply
        const changes = diff(currentYText, newMarkdown);
        let index = 0;
        
        ydoc.transact(() => {
            changes.forEach(([type, text]) => {
                if (type === 1) { // Insert
                    yText.insert(index, text);
                    index += text.length;
                } else if (type === -1) { // Delete
                    yText.delete(index, text.length);
                } else { // Equal
                    index += text.length;
                }
            });
        }, 'local');
    };

    const 全プラグイン = useMemo(() => [
        headingsPlugin(), 
        listsPlugin(), 
        quotePlugin(), 
        thematicBreakPlugin(), 
        markdownShortcutPlugin()
        // No YjsPlugin
    ], []);

    return (
        <div className="glass" style={{ borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <h3 style={{fontSize: '1rem'}}>Shared Notes (KPT)</h3>
            <div 
                style={{ 
                    position: 'relative', 
                    flex: 1, 
                    display:'flex', 
                    flexDirection:'column', 
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <MDXEditor
                    ref={エディタ参照}
                    markdown={markdown}
                    onChange={handleMarkdownChange}
                    plugins={全プラグイン}
                    contentEditableClassName="mdx-editor-content"
                    readOnly={読み取り専用}
                    className="dark-theme"
                />
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {同期済み ? '🟢 Synced (Markdown)' : '🔴 Connecting...'}
            </div>
        </div>
    );
}
