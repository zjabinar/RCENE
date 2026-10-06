import { Fragment, type ReactNode } from "react";

/**
 * Puts React nodes into a translated sentence. `t()` leaves the placeholders it was
 * not given in place ("{code}"), and `fill()` swaps them for nodes, so a request code
 * can be bold or kept on one line without splitting the sentence into pieces:
 *
 *   fill(t("board.status", { n: 11 }), { code: <strong className="whitespace-nowrap">REC-0024</strong> })
 */
export function fill(text: string, nodes: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{name !== undefined && name in nodes ? nodes[name] : part}</Fragment>;
  });
}
