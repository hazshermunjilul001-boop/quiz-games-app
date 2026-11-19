import { QuestionTable } from "@/lib/schema";

export default function QuestionTables({
  tables,
  className = "",
}: {
  tables: QuestionTable[];
  className?: string;
}) {
  if (!tables.length) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {tables.map((table, tableIndex) => (
        <div key={tableIndex} className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full border-collapse text-sm text-[var(--foreground)]">
            <caption className="sr-only">{table.caption ?? "Data table for this question"}</caption>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex > 0 ? "border-t border-zinc-200" : ""}>
                  {row.map((cell, cellIndex) => {
                    const isRowLabel = cellIndex === 0 && row.length > 1;
                    return isRowLabel ? (
                      <th key={cellIndex} scope="row" className="bg-zinc-50 px-3 py-2 text-center font-bold">
                        {cell}
                      </th>
                    ) : (
                      <td key={cellIndex} className="px-3 py-2 text-center">
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
