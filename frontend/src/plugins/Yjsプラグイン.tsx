
import { createContext, useContext, useMemo, useEffect, useLayoutEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { WebsocketProvider } from '../lib/y-websocket';
import * as Y from 'yjs';
import { addComposerChild$, RealmPlugin } from '@mdxeditor/editor';
import { 
    createBinding, 
    syncLexicalUpdateToYjs,
    syncYjsChangesToLexical,
    CONNECTED_COMMAND 
} from '@lexical/yjs';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';

// Yjs + MDXEditor Integration Plugin


export function useYjsコラボレーション(docName: string, memberName: string, color: string) {
    const { provider, ydoc } = useMemo(() => {
        const ydoc = new Y.Doc();
        // WebsocketProvider: (serverUrl, roomName, ydoc, options)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsBaseUrl = `${protocol}//${window.location.host}/yjs/`;
        
        const provider = new WebsocketProvider(
            wsBaseUrl,
            docName,
            ydoc,
            { connect: true }
        );

        provider.on('status', (event: { status: string }) => {

        });
        
        provider.on('sync', (isSynced: boolean) => {

        });

        return { provider, ydoc };
    }, [docName]);

    // Expose for debugging
    useEffect(() => {
        (window as any).debugYjs = { provider, ydoc };
    }, [provider, ydoc]);

    // REST Fallback Saver & Polling
    useEffect(() => {
        // Polling
        const pollInterval = setInterval(() => {
            fetch(`/api/sessions/${docName}/yjs-state`)
                .then(res => res.json())
                .then(data => {
                    if (data.state) {
                        const binaryString = atob(data.state);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        Y.applyUpdate(ydoc, bytes, 'api-pull');
                    }
                })
                .catch(e => console.error('[Yjs Polling] Error', e));
        }, 1000);

        let timer: any = null;
        const save = () => {
            const state = Y.encodeStateAsUpdate(ydoc);
            // Convert to Base64
            let binary = '';
            for (let i = 0; i < state.byteLength; i++) {
                binary += String.fromCharCode(state[i]);
            }
            const base64 = btoa(binary);

            fetch(`/api/sessions/${docName}/yjs-state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: base64 })
            }).then(res => {
                if (!res.ok) console.error('[Yjs Fallback] Save failed', res.status);

            }).catch(e => console.error('[Yjs Fallback] Error', e));
        };

        const onUpdate = (_update: Uint8Array, origin: any) => {
            if (origin === 'api-push') return; // Don't loop back
            if (timer) clearTimeout(timer);
            timer = setTimeout(save, 500);
        };

        ydoc.on('update', onUpdate);
        return () => {
            clearInterval(pollInterval);
            ydoc.off('update', onUpdate);
            if (timer) clearTimeout(timer);
        };
    }, [ydoc, docName]);

    return { provider, ydoc };
}

// Context Definition
export const YjsContext = createContext<{
    provider: any;
    ydoc: Y.Doc | null;
    memberName: string;
    color: string;
} | null>(null);

// Static Component
const YjsCollaborationComponent = () => {

    const [editor] = useLexicalComposerContext();
    const context = useContext(YjsContext);

    useLayoutEffect(() => {

        if (!context || !context.provider || !context.ydoc) {

             return;
        }

        const { provider, ydoc, memberName, color } = context;
        try {
            // 1. Create Binding (Restored)
            // Use 'xml' as the standard Lexical/Yjs entry point
            // IMPORTANT: @lexical/yjs uses XmlText for the root, not XmlFragment.
            const id = 'xml';
            const content = ydoc.get(id, Y.XmlText) as Y.XmlText; // Use XmlText content

            let onUpdateMigration: ((e: any, origin: any) => void) | undefined;

            // Migration: Recover from backup_content if content is empty
            const checkAndMigrate = () => {
                // XmlText length check
                if (content.length > 0) return true;

                const backupText = ydoc.getText('backup_content');
                if (backupText.length > 0) {

                    const text = backupText.toString();
                    editor.update(() => {
                        const root = $getRoot();
                        root.clear();
                        root.append($createParagraphNode().append($createTextNode(text)));
                    });
                    return true;
                }
                return false;
            };

            // Try immediately
// Imports moved to top
            
            const binding = createBinding(
                editor, 
                provider, 
                id, 
                ydoc, 
                new Map(),
                undefined
            );


            
            // Expose editor and binding safely
            if (!(window as any).debugYjs) (window as any).debugYjs = {};
            Object.assign((window as any).debugYjs, { editor, binding });

            // 2. Wire up Yjs -> Lexical
            const onYjsUpdate = (events: any[], transaction: any) => {
                if (transaction.origin !== binding) {
                    syncYjsChangesToLexical(binding, provider, events, false);
                }
            };
            content.observeDeep(onYjsUpdate);

            // 3. Wire up Lexical -> Yjs
            const removeLexicalListener = editor.registerUpdateListener((
                { prevEditorState, editorState, dirtyLeaves, dirtyElements, normalizedNodes, tags }
            ) => {
                syncLexicalUpdateToYjs(
                    binding,
                    provider,
                    prevEditorState,
                    editorState,
                    dirtyElements,
                    dirtyLeaves,
                    normalizedNodes,
                    tags
                );
                
                // Debug log
                if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {


                }
            });

            editor.dispatchCommand(CONNECTED_COMMAND, true);
            
            return () => {

                removeLexicalListener();
                content.unobserveDeep(onYjsUpdate);
                if (onUpdateMigration) {
                    ydoc.off('update', onUpdateMigration);
                }
                editor.dispatchCommand(CONNECTED_COMMAND, false);
            };
        } catch (e) {
            console.error('[Yjs] Error in effect:', e);
        }
    }, [editor, context]);

    return null;
};

// Simplified Plugin Factory
export const Yjsプラグイン = (): RealmPlugin => {

    return {
        init: (realm: any) => {

            realm.pub(addComposerChild$, YjsCollaborationComponent);
        }
    };
};
