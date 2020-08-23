package org.ron.pcs.demo.user.repository;

import java.util.Optional;

import org.ron.pcs.demo.user.domain.Account;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByEmail(String email);

    Account findByUsername(String username);
}