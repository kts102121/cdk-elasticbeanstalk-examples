package org.ron.pcs.demo.user.controller;

import javax.validation.Valid;

import org.ron.pcs.demo.user.domain.LoginForm;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
public class UserLoginController {
    @GetMapping("/login")
    public String login(@ModelAttribute("loginForm") LoginForm loginForm, Model model) {
        log.info("model: {}", model.toString());

        return "login";
    }
}