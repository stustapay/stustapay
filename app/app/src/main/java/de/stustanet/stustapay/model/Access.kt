package de.stustanet.stustapay.model

/**
 * client-side privilege checks.
 */
object Access {
    fun canCreateUser(user: User): Boolean {
        return user.privileges.any {
            it == Privilege.admin || it == Privilege.finanzorga
        }
    }
}