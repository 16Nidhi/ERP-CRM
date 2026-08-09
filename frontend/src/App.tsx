import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Users,
  XCircle,
} from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api, getApiErrorMessage, unwrap } from './api';
import { AuthProvider, useAuth } from './auth';
import { ThemeProvider, useTheme } from './theme';
import type {
  Challan,
  ChallanStatus,
  Customer,
  CustomerStatus,
  CustomerType,
  Paginated,
  Product,
  StockMovement,
  StockMovementType,
} from './types';

const customerTypes: CustomerType[] = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'];
const customerStatuses: CustomerStatus[] = ['LEAD', 'ACTIVE', 'INACTIVE'];
const challanStatuses: ChallanStatus[] = ['DRAFT', 'CONFIRMED', 'CANCELLED'];

function money(value: string | number | undefined | null) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(Number(value ?? 0));
}

function date(value?: string | null) {
  return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
}

function badgeClass(value: string) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20',
    CONFIRMED:
      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20',
    CANCELLED: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-400/10 dark:text-red-200 dark:ring-red-300/20',
    LEAD: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-300/20',
    ACTIVE:
      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20',
    INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20',
    IN: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20',
    OUT: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-400/10 dark:text-orange-200 dark:ring-orange-300/20',
  };

  return styles[value] ?? 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20';
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badgeClass(value)}`}>{value}</span>;
}

function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <RefreshCw className="h-4 w-4 animate-spin" />
      {label}
    </span>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-white/10 dark:bg-white/5">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">Could not load data</p>
          <p className="text-sm">{message}</p>
          <button className="btn btn-secondary mt-3 h-9" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Pagination({ meta, onPage }: { meta: Paginated<unknown>['meta']; onPage: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400">
      <span>
        Page {meta.page} of {Math.max(meta.totalPages, 1)} | {meta.total} records
      </span>
      <div className="flex gap-2">
        <button className="btn btn-secondary h-9" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </button>
        <button className="btn btn-secondary h-9" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:border dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-100 dark:backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">{title}</h2>
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10" onClick={onClose} aria-label="Close">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/challans', label: 'Challans', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block dark:border-white/10 dark:bg-slate-950/80 dark:backdrop-blur-md">
        <Link to="/dashboard" className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white dark:bg-brand-500 dark:text-slate-950">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-slate-950 dark:text-slate-100">Mini ERP</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">CRM Operations</p>
          </div>
        </Link>
        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 overflow-x-auto lg:hidden">
              {nav.map((item) => (
                <NavLink key={item.to} to={item.to} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100">
                  <item.icon className="h-5 w-5" />
                </NavLink>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
              </div>
              <button
                className="btn btn-secondary w-10 px-0"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button className="btn btn-secondary" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/challans" element={<ChallansPage />} />
            <Route path="/challans/new" element={<NewChallanPage />} />
            <Route path="/challans/:id" element={<ChallanDetailPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
      toast.success('Welcome back');
    } catch (loginError) {
      const message = getApiErrorMessage(loginError);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white">
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-950">Sign in to Mini ERP</h1>
          <p className="mt-2 text-sm text-slate-500">Use your workspace account to continue.</p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? <Spinner label="Signing in" /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [customers, setCustomers] = useState<Paginated<Customer> | null>(null);
  const [products, setProducts] = useState<Paginated<Product> | null>(null);
  const [challans, setChallans] = useState<Paginated<Challan> | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const [customerData, productData, challanData] = await Promise.all([
        unwrap<Paginated<Customer>>(api.get('/customers', { params: { limit: 1 } })),
        unwrap<Paginated<Product>>(api.get('/products', { params: { limit: 100 } })),
        unwrap<Paginated<Challan>>(api.get('/challans', { params: { limit: 5 } })),
      ]);
      setCustomers(customerData);
      setProducts(productData);
      setChallans(challanData);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const loading = !customers && !products && !challans && !error;
  const lowStock = products?.items.filter((product) => product.lowStock || product.currentStock <= product.minStockAlert).length ?? 0;

  return (
    <>
      <PageHeader title="Dashboard" description="A quick read on customers, inventory, and challan activity." />
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {loading ? <Spinner /> : null}
      {!loading && !error ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard title="Customers" value={customers?.meta.total ?? 0} icon={<Users className="h-5 w-5" />} />
            <SummaryCard title="Products" value={products?.meta.total ?? 0} icon={<Package className="h-5 w-5" />} />
            <SummaryCard title="Low Stock" value={lowStock} icon={<AlertCircle className="h-5 w-5" />} />
            <SummaryCard title="Recent Challans" value={challans?.items.length ?? 0} icon={<ClipboardList className="h-5 w-5" />} />
          </div>
          <div className="panel mt-6 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-950">Recent challans</h2>
            </div>
            {challans?.items.length ? (
              <div className="divide-y divide-slate-100">
                {challans.items.map((challan) => (
                  <Link key={challan.id} to={`/challans/${challan.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-950">{challan.challanNumber}</p>
                      <p className="text-sm text-slate-500">{challan.customer?.name ?? 'Customer'} | {date(challan.createdAt)}</p>
                    </div>
                    <StatusBadge value={challan.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState title="No challans yet" description="Create a draft challan once customer and product data is ready." />
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="rounded-lg bg-brand-50 p-2 text-brand-700">{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function CustomersPage() {
  const { canManageCustomers } = useAuth();
  const [data, setData] = useState<Paginated<Customer> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      setError('');
      setData(await unwrap<Paginated<Customer>>(api.get('/customers', { params: { page, limit: 10, search } })));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    void load();
  }, [page, search]);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Search leads, customers, and account contacts."
        action={
          canManageCustomers ? (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Add Customer
            </button>
          ) : null
        }
      />
      <div className="panel overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <SearchBox value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search name, mobile, business" />
        </div>
        {error ? <div className="p-4"><ErrorState message={error} onRetry={load} /></div> : null}
        {!data && !error ? <div className="p-4"><Spinner /></div> : null}
        {data ? data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Follow-ups</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <Link className="font-semibold text-brand-700 hover:text-brand-600" to={`/customers/${customer.id}`}>
                          {customer.name}
                        </Link>
                        <p className="text-xs text-slate-500">{customer.businessName ?? 'Individual'}</p>
                      </td>
                      <td className="table-cell text-slate-600">{customer.mobile}<br />{customer.email ?? '-'}</td>
                      <td className="table-cell">{customer.customerType}</td>
                      <td className="table-cell"><StatusBadge value={customer.status} /></td>
                      <td className="table-cell">{customer._count?.followUps ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        ) : <div className="p-4"><EmptyState title="No customers found" description="Try a different search or add a customer." /></div> : null}
      </div>
      {showCreate ? <CustomerFormModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); void load(); }} /> : null}
    </>
  );
}

type CustomerForm = {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string;
  notes: string;
};

function customerFormDefaults(customer?: Customer): CustomerForm {
  return {
    name: customer?.name ?? '',
    mobile: customer?.mobile ?? '',
    email: customer?.email ?? '',
    businessName: customer?.businessName ?? '',
    gstNumber: customer?.gstNumber ?? '',
    customerType: customer?.customerType ?? 'RETAIL',
    address: customer?.address ?? '',
    status: customer?.status ?? 'LEAD',
    followUpDate: customer?.followUpDate ? customer.followUpDate.slice(0, 16) : '',
    notes: customer?.notes ?? '',
  };
}

function CustomerFormModal({ customer, onClose, onSaved }: { customer?: Customer; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CustomerForm>(() => customerFormDefaults(customer));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(customer);
  const setField = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.mobile.trim()) {
      setError('Name and mobile are required.');
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form, followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined };
      if (isEdit && customer) {
        await unwrap<Customer>(api.put(`/customers/${customer.id}`, payload));
        toast.success('Customer updated');
      } else {
        await unwrap<Customer>(api.post('/customers', payload));
        toast.success('Customer created');
      }
      onSaved();
    } catch (saveError) {
      const message = getApiErrorMessage(saveError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Customer' : 'Add Customer'} onClose={onClose}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Name" value={form.name} onChange={(value) => setField('name', value)} />
        <Field label="Mobile" value={form.mobile} onChange={(value) => setField('mobile', value)} />
        <Field label="Email" type="email" value={form.email} onChange={(value) => setField('email', value)} />
        <Field label="Business" value={form.businessName} onChange={(value) => setField('businessName', value)} />
        <Field label="GST Number" value={form.gstNumber} onChange={(value) => setField('gstNumber', value)} />
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.customerType} onChange={(event) => setField('customerType', event.target.value as CustomerType)}>
            {customerTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(event) => setField('status', event.target.value as CustomerStatus)}>
            {customerStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        <Field label="Follow-up Date" type="datetime-local" value={form.followUpDate} onChange={(value) => setField('followUpDate', value)} />
        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <textarea className="input min-h-20 py-2" value={form.address} onChange={(event) => setField('address', event.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea className="input min-h-20 py-2" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
        </div>
        {error ? <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner label="Saving" /> : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function CustomerDetailPage() {
  const { id } = useParams();
  const { canManageCustomers } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setError('');
      setCustomer(await unwrap<Customer>(api.get(`/customers/${id}`)));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const addNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim() || !id) return;
    try {
      setSavingNote(true);
      await unwrap(api.post(`/customers/${id}/followups`, { note }));
      setNote('');
      toast.success('Follow-up added');
      await load();
    } catch (noteError) {
      toast.error(getApiErrorMessage(noteError));
    } finally {
      setSavingNote(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!customer) return <Spinner />;

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.businessName ?? 'Customer profile'}
        action={
          <div className="flex gap-2">
            <Link className="btn btn-secondary" to="/customers"><ArrowLeft className="h-4 w-4" />Back</Link>
            {canManageCustomers ? <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit</button> : null}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="panel p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Mobile" value={customer.mobile} />
            <Info label="Email" value={customer.email ?? '-'} />
            <Info label="Type" value={customer.customerType} />
            <Info label="Status" value={<StatusBadge value={customer.status} />} />
            <Info label="GST" value={customer.gstNumber ?? '-'} />
            <Info label="Next follow-up" value={date(customer.followUpDate)} />
          </div>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <Info label="Address" value={customer.address ?? '-'} />
            <Info label="Notes" value={customer.notes ?? '-'} />
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold text-slate-950">Follow-up timeline</h2>
          {canManageCustomers ? (
            <form className="mt-4 space-y-3" onSubmit={addNote}>
              <textarea className="input min-h-24 py-2" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a follow-up note" />
              <button className="btn btn-primary w-full" disabled={savingNote || !note.trim()}>{savingNote ? <Spinner label="Adding" /> : 'Add Follow-up'}</button>
            </form>
          ) : null}
          <div className="mt-5 space-y-3">
            {customer.followUps?.length ? customer.followUps.map((followUp) => (
              <div key={followUp.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-sm text-slate-800">{followUp.note}</p>
                <p className="mt-2 text-xs text-slate-500">{date(followUp.followUpAt)} by {followUp.createdBy?.name ?? 'User'}</p>
              </div>
            )) : <EmptyState title="No follow-ups" description="Follow-up history will appear here." />}
          </div>
        </div>
      </div>
      {editing ? <CustomerFormModal customer={customer} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void load(); }} /> : null}
    </>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function ProductsPage() {
  const { canManageProducts } = useAuth();
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      setError('');
      setData(await unwrap<Paginated<Product>>(api.get('/products', { params: { page, limit: 10, search } })));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    void load();
  }, [page, search]);

  return (
    <>
      <PageHeader
        title="Products"
        description="Inventory catalog with stock visibility."
        action={canManageProducts ? <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />Add Product</button> : null}
      />
      <div className="panel overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <SearchBox value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search name, SKU, category" />
        </div>
        {error ? <div className="p-4"><ErrorState message={error} onRetry={load} /></div> : null}
        {!data && !error ? <div className="p-4"><Spinner /></div> : null}
        {data ? data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <Link className="font-semibold text-brand-700 hover:text-brand-600" to={`/products/${product.id}`}>{product.name}</Link>
                        <p className="text-xs text-slate-500">{product.sku}</p>
                      </td>
                      <td className="table-cell">{product.category ?? '-'}</td>
                      <td className="table-cell">₹{money(product.unitPrice)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{product.currentStock}</span>
                          {(product.lowStock || product.currentStock <= product.minStockAlert) ? <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">Low</span> : null}
                        </div>
                      </td>
                      <td className="table-cell">{product.location ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        ) : <div className="p-4"><EmptyState title="No products found" description="Try a different search or add a product." /></div> : null}
      </div>
      {showCreate ? <ProductFormModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); void load(); }} /> : null}
    </>
  );
}

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStockAlert: string;
  location: string;
};

function productFormDefaults(product?: Product): ProductForm {
  return {
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? '',
    unitPrice: String(product?.unitPrice ?? ''),
    currentStock: String(product?.currentStock ?? 0),
    minStockAlert: String(product?.minStockAlert ?? 0),
    location: product?.location ?? '',
  };
}

function ProductFormModal({ product, onClose, onSaved }: { product?: Product; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ProductForm>(() => productFormDefaults(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(product);
  const setField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.sku.trim() || Number(form.unitPrice) <= 0) {
      setError('Name, SKU, and a positive price are required.');
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form, unitPrice: Number(form.unitPrice), currentStock: Number(form.currentStock), minStockAlert: Number(form.minStockAlert) };
      if (isEdit && product) {
        await unwrap<Product>(api.put(`/products/${product.id}`, payload));
        toast.success('Product updated');
      } else {
        await unwrap<Product>(api.post('/products', payload));
        toast.success('Product created');
      }
      onSaved();
    } catch (saveError) {
      const message = getApiErrorMessage(saveError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Product' : 'Add Product'} onClose={onClose}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Name" value={form.name} onChange={(value) => setField('name', value)} />
        <Field label="SKU" value={form.sku} onChange={(value) => setField('sku', value)} />
        <Field label="Category" value={form.category} onChange={(value) => setField('category', value)} />
        <Field label="Unit Price" type="number" value={form.unitPrice} onChange={(value) => setField('unitPrice', value)} />
        <Field label="Current Stock" type="number" value={form.currentStock} onChange={(value) => setField('currentStock', value)} />
        <Field label="Min Stock Alert" type="number" value={form.minStockAlert} onChange={(value) => setField('minStockAlert', value)} />
        <div className="sm:col-span-2"><Field label="Location" value={form.location} onChange={(value) => setField('location', value)} /></div>
        {error ? <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner label="Saving" /> : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ProductDetailPage() {
  const { id } = useParams();
  const { canManageProducts } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Paginated<StockMovement> | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [movementType, setMovementType] = useState<StockMovementType>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setError('');
      const [productData, movementData] = await Promise.all([
        unwrap<Product>(api.get(`/products/${id}`)),
        unwrap<Paginated<StockMovement>>(api.get(`/products/${id}/stock-movements`, { params: { limit: 20 } })),
      ]);
      setProduct(productData);
      setMovements(movementData);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const addMovement = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || Number(quantity) <= 0 || !reason.trim()) return;
    try {
      setSaving(true);
      await unwrap(api.post(`/products/${id}/stock-movements`, { quantity: Number(quantity), movementType, reason }));
      toast.success('Stock movement recorded');
      setQuantity('');
      setReason('');
      await load();
    } catch (movementError) {
      toast.error(getApiErrorMessage(movementError));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!product) return <Spinner />;

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.sku}
        action={
          <div className="flex gap-2">
            <Link className="btn btn-secondary" to="/products"><ArrowLeft className="h-4 w-4" />Back</Link>
            {canManageProducts ? <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit</button> : null}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="panel p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Price" value={`₹${money(product.unitPrice)}`} />
            <Info label="Stock" value={<span>{product.currentStock} {(product.lowStock || product.currentStock <= product.minStockAlert) ? <span className="ml-2 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">Low stock</span> : null}</span>} />
            <Info label="Category" value={product.category ?? '-'} />
            <Info label="Alert Threshold" value={product.minStockAlert} />
            <Info label="Location" value={product.location ?? '-'} />
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold text-slate-950">Stock movement</h2>
          {canManageProducts ? (
            <form className="mt-4 grid gap-3" onSubmit={addMovement}>
              <select className="input" value={movementType} onChange={(event) => setMovementType(event.target.value as StockMovementType)}>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
              <input className="input" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" />
              <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />
              <button className="btn btn-primary" disabled={saving || Number(quantity) <= 0 || !reason.trim()}>{saving ? <Spinner label="Recording" /> : 'Record Movement'}</button>
            </form>
          ) : null}
          <div className="mt-5 space-y-3">
            {movements?.items.length ? movements.items.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div>
                  <StatusBadge value={movement.movementType} />
                  <p className="mt-2 text-sm font-medium text-slate-900">{movement.reason}</p>
                  <p className="text-xs text-slate-500">{date(movement.createdAt)} by {movement.createdBy?.name ?? 'User'}</p>
                </div>
                <p className="text-lg font-bold text-slate-950">{movement.quantity}</p>
              </div>
            )) : <EmptyState title="No stock history" description="Movements will appear after inventory updates." />}
          </div>
        </div>
      </div>
      {editing ? <ProductFormModal product={product} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void load(); }} /> : null}
    </>
  );
}

function ChallansPage() {
  const { canManageChallans } = useAuth();
  const [data, setData] = useState<Paginated<Challan> | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      setData(await unwrap<Paginated<Challan>>(api.get('/challans', { params: { page, limit: 10, search, status: status || undefined } })));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    void load();
  }, [page, search, status]);

  return (
    <>
      <PageHeader
        title="Challans"
        description="Draft, confirm, and review delivery challans."
        action={canManageChallans ? <Link className="btn btn-primary" to="/challans/new"><Plus className="h-4 w-4" />Create Challan</Link> : null}
      />
      <div className="panel overflow-hidden">
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_220px]">
          <SearchBox value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search challan number or customer" />
          <select className="input" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
            <option value="">All statuses</option>
            {challanStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {error ? <div className="p-4"><ErrorState message={error} onRetry={load} /></div> : null}
        {!data && !error ? <div className="p-4"><Spinner /></div> : null}
        {data ? data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Challan</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((challan) => (
                    <tr key={challan.id} className="hover:bg-slate-50">
                      <td className="table-cell"><Link className="font-semibold text-brand-700 hover:text-brand-600" to={`/challans/${challan.id}`}>{challan.challanNumber}</Link></td>
                      <td className="table-cell">{challan.customer?.name ?? '-'}</td>
                      <td className="table-cell">{challan.totalQuantity}</td>
                      <td className="table-cell"><StatusBadge value={challan.status} /></td>
                      <td className="table-cell">{date(challan.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        ) : <div className="p-4"><EmptyState title="No challans found" description="Create a draft challan or adjust filters." /></div> : null}
      </div>
    </>
  );
}

function NewChallanPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: '1' }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [customerData, productData] = await Promise.all([
          unwrap<Paginated<Customer>>(api.get('/customers', { params: { limit: 100 } })),
          unwrap<Paginated<Product>>(api.get('/products', { params: { limit: 100 } })),
        ]);
        setCustomers(customerData.items);
        setProducts(productData.items);
        setCustomerId(customerData.items[0]?.id ?? '');
        setItems([{ productId: productData.items[0]?.id ?? '', quantity: '1' }]);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [items]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!customerId || items.some((item) => !item.productId || Number(item.quantity) <= 0)) {
      setError('Choose a customer and enter positive quantities for every item.');
      return;
    }
    try {
      setSaving(true);
      const challan = await unwrap<Challan>(api.post('/challans', {
        customerId,
        items: items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
      }));
      toast.success('Draft challan created');
      navigate(`/challans/${challan.id}`);
    } catch (saveError) {
      const message = getApiErrorMessage(saveError);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (error && (!customers.length || !products.length)) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <>
      <PageHeader title="Create Challan" description="Draft a challan from current product snapshots." action={<Link className="btn btn-secondary" to="/challans"><ArrowLeft className="h-4 w-4" />Back</Link>} />
      <form className="panel p-5" onSubmit={submit}>
        <div className="max-w-xl">
          <label className="label">Customer</label>
          <select className="input" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} {customer.businessName ? `| ${customer.businessName}` : ''}</option>)}
          </select>
        </div>
        <div className="mt-6 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_140px_44px]">
              <select className="input" value={item.productId} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, productId: event.target.value } : row))}>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} | {product.sku} | Stock {product.currentStock}</option>)}
              </select>
              <input className="input" type="number" min="1" value={item.quantity} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row))} />
              <button type="button" className="btn btn-secondary px-0" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => setItems((current) => [...current, { productId: products[0]?.id ?? '', quantity: '1' }])}>
            <Plus className="h-4 w-4" />
            Add Item
          </button>
          <p className="text-sm font-semibold text-slate-700">Total Quantity: {totalQuantity}</p>
        </div>
        {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Link className="btn btn-secondary" to="/challans">Cancel</Link>
          <button className="btn btn-primary" disabled={saving || !customers.length || !products.length}>{saving ? <Spinner label="Saving" /> : 'Save Draft'}</button>
        </div>
      </form>
    </>
  );
}

function ChallanDetailPage() {
  const { id } = useParams();
  const { canManageChallans } = useAuth();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setError('');
      setChallan(await unwrap<Challan>(api.get(`/challans/${id}`)));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const runAction = async (type: 'confirm' | 'cancel') => {
    if (!id) return;
    const copy = type === 'confirm' ? 'Confirm this challan and deduct stock?' : 'Cancel this draft challan?';
    if (!window.confirm(copy)) return;
    try {
      setBusy(type);
      const updated = await unwrap<Challan>(api.post(`/challans/${id}/${type}`));
      setChallan(updated);
      toast.success(type === 'confirm' ? 'Challan confirmed' : 'Challan cancelled');
    } catch (actionError) {
      toast.error(getApiErrorMessage(actionError));
    } finally {
      setBusy(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!challan) return <Spinner />;

  return (
    <>
      <PageHeader
        title={challan.challanNumber}
        description="Item names, SKUs, and prices are stored snapshots from draft creation."
        action={
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-secondary" to="/challans"><ArrowLeft className="h-4 w-4" />Back</Link>
            {canManageChallans && challan.status === 'DRAFT' ? (
              <>
                <button className="btn btn-primary" disabled={busy !== null} onClick={() => void runAction('confirm')}>
                  <CheckCircle2 className="h-4 w-4" />
                  {busy === 'confirm' ? 'Confirming' : 'Confirm'}
                </button>
                <button className="btn btn-danger" disabled={busy !== null} onClick={() => void runAction('cancel')}>
                  {busy === 'cancel' ? 'Cancelling' : 'Cancel'}
                </button>
              </>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <StatusBadge value={challan.status} />
            <p className="text-sm text-slate-500">{date(challan.createdAt)}</p>
          </div>
          <div className="mt-5 space-y-4">
            <Info label="Customer" value={challan.customer?.name ?? '-'} />
            <Info label="Mobile" value={challan.customer?.mobile ?? '-'} />
            <Info label="Business" value={challan.customer?.businessName ?? '-'} />
            <Info label="Total Quantity" value={challan.totalQuantity} />
            <Info label="Confirmed At" value={date(challan.confirmedAt)} />
          </div>
        </div>
        <div className="panel overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-950">Snapshot items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Product Snapshot</th>
                  <th className="px-4 py-3">SKU Snapshot</th>
                  <th className="px-4 py-3">Unit Price Snapshot</th>
                  <th className="px-4 py-3">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {challan.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="table-cell font-semibold text-slate-950">{item.productNameSnapshot}</td>
                    <td className="table-cell">{item.skuSnapshot}</td>
                    <td className="table-cell">₹{money(item.unitPriceSnapshot)}</td>
                    <td className="table-cell">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
