import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, Lock, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Conta() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <User className="h-6 w-6" />
          Minha Conta
        </h2>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      {/* Perfil */}
      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Informações do perfil</h3>
          
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg">AD</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                Alterar foto
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou GIF. Máximo 2MB.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  className="pl-10"
                  defaultValue="Admin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  defaultValue="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Salvar alterações</Button>
        </div>
      </Card>

      {/* Segurança */}
      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Segurança</h3>
          <p className="text-sm text-muted-foreground">
            Altere sua senha para manter sua conta segura
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Alterar senha</Button>
        </div>
      </Card>

      {/* Zona de perigo */}
      <Card className="p-6 space-y-4 border-destructive">
        <div>
          <h3 className="text-lg font-semibold text-destructive mb-1">Zona de perigo</h3>
          <p className="text-sm text-muted-foreground">
            Ações irreversíveis para sua conta
          </p>
        </div>

        <Separator />

        <Alert variant="destructive">
          <AlertDescription>
            Ao excluir sua conta, todos os seus dados serão permanentemente removidos. 
            Esta ação não pode ser desfeita.
          </AlertDescription>
        </Alert>

        <Button variant="destructive" className="flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          Excluir minha conta
        </Button>
      </Card>
    </div>
  );
}
