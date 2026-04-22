import { describe, it, expect } from 'vitest';
import { PAGE_PERMISSIONS } from './permissions';

describe('PAGE_PERMISSIONS configuration', () => {
  it('every page has at least one allowed role', () => {
    for (const [page, roles] of Object.entries(PAGE_PERMISSIONS)) {
      expect(roles.length, `${page} must have at least one role`).toBeGreaterThan(0);
    }
  });

  it('super_admin can access every page', () => {
    for (const [page, roles] of Object.entries(PAGE_PERMISSIONS)) {
      expect(roles, `super_admin must be in ${page}`).toContain('super_admin');
    }
  });

  it('admin can access every page', () => {
    for (const [page, roles] of Object.entries(PAGE_PERMISSIONS)) {
      expect(roles, `admin must be in ${page}`).toContain('admin');
    }
  });

  it('cashier can access cashier and journal pages', () => {
    expect(PAGE_PERMISSIONS.cashier).toContain('cashier');
    expect(PAGE_PERMISSIONS.journal).toContain('cashier');
  });

  it('cashier cannot access admin-only pages', () => {
    expect(PAGE_PERMISSIONS.staff).not.toContain('cashier');
    expect(PAGE_PERMISSIONS.settings).not.toContain('cashier');
    expect(PAGE_PERMISSIONS.analytics).not.toContain('cashier');
  });

  it('doctor can access pharmacy and queue', () => {
    expect(PAGE_PERMISSIONS.pharmacy).toContain('doctor');
    expect(PAGE_PERMISSIONS.queue).toContain('doctor');
  });

  it('lab_tech can access laboratory page', () => {
    expect(PAGE_PERMISSIONS.laboratory).toContain('lab_tech');
  });

  it('lab_tech cannot access pharmacy or cashier pages', () => {
    expect(PAGE_PERMISSIONS.pharmacy).not.toContain('lab_tech');
    expect(PAGE_PERMISSIONS.cashier).not.toContain('lab_tech');
  });

  it('pharmacist can access pharmacy page', () => {
    expect(PAGE_PERMISSIONS.pharmacy).toContain('pharmacist');
  });

  it('pharmacist cannot access analytics or staff pages', () => {
    expect(PAGE_PERMISSIONS.analytics).not.toContain('pharmacist');
    expect(PAGE_PERMISSIONS.staff).not.toContain('pharmacist');
  });

  it('help page is accessible to most roles', () => {
    const helpRoles = PAGE_PERMISSIONS.help;
    expect(helpRoles).toContain('doctor');
    expect(helpRoles).toContain('cashier');
    expect(helpRoles).toContain('receptionist');
  });

  it('subscription and archive are admin-only areas', () => {
    expect(PAGE_PERMISSIONS.subscription).not.toContain('doctor');
    expect(PAGE_PERMISSIONS.archive).not.toContain('cashier');
  });
});
