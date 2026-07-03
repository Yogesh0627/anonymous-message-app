import { connectDB } from "@/dbConfig/db";
import UserModel from "@/models/user";
import { authOptions } from "../auth/[...nextauth]/options";
import { getServerSession, User } from "next-auth";
import mongoose from "mongoose";

// Change streams and long-lived connections require the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream that pushes new messages to a signed-in user's
 * dashboard in real time using a MongoDB change stream on their own document.
 *
 * Requires a replica set (MongoDB Atlas provides this by default). On a
 * standalone mongod the change stream errors; we emit an `error` event and the
 * client falls back to manual refresh — the app stays fully functional.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as User | undefined;

  if (!session || !sessionUser?._id) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();
  const userId = new mongoose.Types.ObjectId(sessionUser._id);
  const encoder = new TextEncoder();

  // Per-request resources, closed over by both start() and cancel().
  let changeStream: mongoose.mongo.ChangeStream | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
    const cs = changeStream;
    changeStream = null;
    if (cs) {
      try {
        // close() may return a Promise or void depending on the driver — handle both.
        const result = cs.close() as unknown as Promise<void> | void;
        if (result && typeof (result as Promise<void>).then === "function") {
          (result as Promise<void>).catch(() => {});
        }
      } catch {
        /* already closed */
      }
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          /* controller already closed */
        }
      };

      send("connected", { ok: true });

      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* controller already closed */
        }
      }, 25_000);

      try {
        changeStream = UserModel.watch(
          [{ $match: { "documentKey._id": userId, operationType: "update" } }],
          { fullDocument: "updateLookup" }
        );

        changeStream.on("change", (change: any) => {
          const updated = change.updateDescription?.updatedFields ?? {};
          for (const [key, value] of Object.entries(updated)) {
            // $push produces keys like "messages.7" carrying the new subdocument.
            if (/^messages\.\d+$/.test(key)) {
              send("message", value);
            }
          }
        });

        changeStream.on("error", () => send("error", { message: "stream_unavailable" }));
      } catch {
        send("error", { message: "stream_unavailable" });
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
