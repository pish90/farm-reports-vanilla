package com.farmreports.api.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

/**
 * Centralised role-check helpers used across controllers.
 *
 * Roles (ordered by privilege):
 *   ADMIN        – full access
 *   FARM_MANAGER – manage their farm (workers, attendance, stock, expenses, submit reports)
 *   OPS          – read everything + create expenses only
 *   VIEWER       – read only
 *   MANAGER / WORKER – legacy roles, treated as FARM_MANAGER / VIEWER respectively
 */
public final class RoleHelper {

    private RoleHelper() {}

    /** True if the authenticated principal holds any of the given role names (no ROLE_ prefix). */
    public static boolean hasAnyRole(Authentication auth, String... roles) {
        for (var authority : auth.getAuthorities()) {
            String a = authority.getAuthority();
            for (String role : roles) {
                if (a.equals("ROLE_" + role)) return true;
            }
        }
        return false;
    }

    /** Throws 403 unless the principal holds at least one of the supplied roles. */
    public static void require(Authentication auth, String... roles) {
        if (!hasAnyRole(auth, roles))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    // ── convenience shortcuts ──────────────────────────────────────────────────

    /** ADMIN only – user/category management. */
    public static void requireAdmin(Authentication auth) {
        require(auth, "ADMIN");
    }

    /** ADMIN | FARM_MANAGER | legacy MANAGER – workers, attendance, stock records, report submit. */
    public static void requireManager(Authentication auth) {
        require(auth, "ADMIN", "FARM_MANAGER", "MANAGER");
    }

    /** ADMIN | FARM_MANAGER | MANAGER | OPS – create expenses. */
    public static void requireExpenseCreate(Authentication auth) {
        require(auth, "ADMIN", "FARM_MANAGER", "MANAGER", "OPS");
    }
}
