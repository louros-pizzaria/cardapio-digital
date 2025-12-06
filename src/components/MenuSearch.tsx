import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
interface MenuSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}
export const MenuSearch = ({
  searchTerm,
  onSearchChange
}: MenuSearchProps) => {
  return <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input placeholder="Buscar produto..." value={searchTerm} onChange={e => onSearchChange(e.target.value)} className="pl-10" />
      </div>
      
    </div>;
};