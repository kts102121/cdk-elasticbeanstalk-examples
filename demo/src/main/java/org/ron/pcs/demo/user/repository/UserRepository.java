package org.ron.pcs.demo.user.repository;

import org.ron.pcs.demo.user.domain.Account;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<Account, Long> {
        
}