package org.ron.pcs.demo.user.service;

import org.ron.pcs.demo.application.exception.domain.BusinessException;
import org.ron.pcs.demo.application.exception.dto.ErrorCode;
import org.ron.pcs.demo.user.domain.Account;
import org.ron.pcs.demo.user.domain.AccountDTO;
import org.ron.pcs.demo.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public Account create(final AccountDTO.SignUpReq accountDto) {
        final Account account = userRepository.findByUsername(accountDto.getUsername());
        if (account == null) {
            return userRepository.save(accountDto.toEntity());
        } else {
            throw new BusinessException("The username or email you provided is already taken", ErrorCode.IDENTIFIER_DUPLICATE);
        }
    }
}