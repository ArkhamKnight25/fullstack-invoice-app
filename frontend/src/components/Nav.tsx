import { NavLink } from 'react-router-dom';

export function Nav() {
  return (
    <nav className="nav">
      <span className="nav-brand">InvoiceApp</span>
      <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
        Invoices
      </NavLink>
      <NavLink to="/summary" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
        Summary
      </NavLink>
    </nav>
  );
}
