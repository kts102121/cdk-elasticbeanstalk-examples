package org.ron.pcs.demo.user.service;

import java.util.List;

import org.ron.pcs.demo.user.domain.Account;
import org.ron.pcs.demo.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserFindService {
    private final UserRepository userRepository;

    public Account findOne(final Long id) {
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Account not found"));
    }

    public List<Account> findAll() {
        return userRepository.findAll();
    }

    public Account findByEmail(final String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("Account Not Found"));
    }
}