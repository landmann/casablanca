import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1
              className="mt-10 scroll-mt-24 text-3xl font-semibold tracking-tight first:mt-0"
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              className="mt-10 scroll-mt-24 border-b border-border pb-2 text-2xl font-semibold tracking-tight"
              {...props}
            />
          ),
          h3: (props) => (
            <h3 className="mt-8 scroll-mt-24 text-xl font-semibold" {...props} />
          ),
          h4: (props) => <h4 className="mt-6 text-lg font-semibold" {...props} />,
          p: (props) => <p className="leading-7 text-foreground/90" {...props} />,
          ul: (props) => (
            <ul className="ml-6 list-disc space-y-2 marker:text-muted-foreground" {...props} />
          ),
          ol: (props) => (
            <ol className="ml-6 list-decimal space-y-2 marker:text-muted-foreground" {...props} />
          ),
          li: (props) => <li className="leading-7" {...props} />,
          a: (props) => (
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              target={props.href?.startsWith("http") ? "_blank" : undefined}
              rel={props.href?.startsWith("http") ? "noreferrer" : undefined}
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-2 border-border pl-4 text-muted-foreground"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              className="overflow-x-auto rounded-md border border-border bg-muted p-4 font-mono text-sm"
              {...props}
            />
          ),
          table: (props) => (
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse border border-border text-sm"
                {...props}
              />
            </div>
          ),
          th: (props) => (
            <th
              className="border border-border bg-muted px-3 py-2 text-left font-semibold"
              {...props}
            />
          ),
          td: (props) => <td className="border border-border px-3 py-2 align-top" {...props} />,
          hr: (props) => <hr className="my-8 border-border" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
