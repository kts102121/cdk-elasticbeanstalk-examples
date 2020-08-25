package org.ron.pcs.demo.user.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.ron.pcs.demo.user.domain.AccountDTO;
import org.ron.pcs.demo.user.domain.Role;
import org.ron.pcs.demo.user.domain.AccountDTO.Res;
import org.ron.pcs.demo.user.service.UserFindService;
import org.ron.pcs.demo.user.service.UserService;

import javax.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@CrossOrigin("https://cloudfront.net")
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/user")
public class UserController {
    private final UserService userService;
    private final UserFindService userFindService;
    private final BCryptPasswordEncoder passwordEncoder;

    @GetMapping(value = "/{id}")
    public AccountDTO.Res getUser(@PathVariable final Long id) {
        return new AccountDTO.Res(userFindService.findOne(id));
    }

    @GetMapping
    public List<AccountDTO.Res> getUsers() {
        return userFindService.findAll().stream()
                .map(account -> new AccountDTO.Res(account))
                .collect(Collectors.toList());
    }

    @PostMapping
    @ResponseStatus(value = HttpStatus.CREATED)
    public Res signUp(@RequestBody @Valid final AccountDTO.SignUpReq dto) {
        dto.setPassword(passwordEncoder.encode(dto.getPassword()));

        Role role;

        if (dto.getEmail().endsWith("@myawesomeorg.com")) {
            role = Role.builder().name("ROLE_ADMIN").build();
            dto.addRole(role);
        } else {
            role = Role.builder().name("ROLE_USER").build();
            dto.addRole(role);
        }

        return new AccountDTO.Res(userService.create(dto));
    }
}
