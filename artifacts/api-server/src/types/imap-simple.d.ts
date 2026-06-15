declare module "imap-simple" {
  interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    authTimeout?: number;
    connTimeout?: number;
    tlsOptions?: object;
  }

  interface ImapSimpleOptions {
    imap: ImapConfig;
  }

  interface MessageBodyPart {
    type: string;
    subtype?: string;
    disposition?: { type: string; params?: Record<string, string> } | null;
    encoding?: string;
    params?: Record<string, string>;
    size?: number;
    partID?: string;
    parts?: MessageBodyPart[];
  }

  interface MessagePart {
    which: string;
    size: number;
    body: string | Buffer;
  }

  interface Message {
    attributes: {
      uid: number;
      flags: string[];
      date: Date;
      struct?: MessageBodyPart[];
    };
    parts: MessagePart[];
  }

  interface ImapSimple {
    openBox(boxName: string): Promise<void>;
    search(searchCriteria: unknown[], fetchOptions: object): Promise<Message[]>;
    getPartData(message: Message, part: MessageBodyPart): Promise<Buffer>;
    end(): void;
  }

  function connect(options: ImapSimpleOptions): Promise<ImapSimple>;
  function getParts(struct: MessageBodyPart[]): MessageBodyPart[];

  export { connect, getParts, ImapSimple, ImapSimpleOptions, Message, MessageBodyPart, MessagePart };
}
