import { json } from "@/lib/http";
import { boardView } from "@/lib/present";
import { readGame } from "@/lib/store";

export async function GET() {
  return json(boardView(await readGame()));
}
