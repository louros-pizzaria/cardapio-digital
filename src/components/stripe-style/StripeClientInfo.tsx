interface StripeClientInfoProps {
  order: any;
}

export const StripeClientInfo = ({ order }: StripeClientInfoProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Cliente</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Nome
          </label>
          <p className="text-sm text-gray-900 mt-1">
            {order.customer_name || 'Não informado'}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Telefone
          </label>
          <p className="text-sm text-gray-900 mt-1">
            {order.customer_phone || 'Não informado'}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            CPF
          </label>
          <p className="text-sm text-gray-900 mt-1">
            {order.customer_cpf || '—'}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Email
          </label>
          <p className="text-sm text-gray-900 mt-1 truncate">
            {order.customer_email || '—'}
          </p>
        </div>
      </div>
    </div>
  );
};
