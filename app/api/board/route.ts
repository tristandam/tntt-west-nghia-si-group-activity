import { json } from "@/lib/http";
import { boardView } from "@/lib/present";
import { readGame } from "@/lib/store";

export async function GET() {
  const data = await readGame();
  return json(boardView(data, Date.now()));
}
