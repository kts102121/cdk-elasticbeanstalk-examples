package org.ron.pcs.demo.user.service;

import org.ron.pcs.demo.application.exception.domain.user.UserNotFoundException;
import org.ron.pcs.demo.user.domain.Account;
import org.ron.pcs.demo.user.domain.AccountPrincipal;
import org.ron.pcs.demo.user.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userReposotiry;

    @Override
    public UserDetails loadUserByUsername(String username) {
        final Account account = userReposotiry.findByUsername(username);

        if (account == null) {
            throw new UserNotFoundException(username);
        }

        log.info("account: {}", account.toString());
        
        return new AccountPrincipal(account);
    }
}