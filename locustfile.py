from locust import HttpUser, task

class LoadTestUser(HttpUser):
    @task
    def load_test_user(self):
        self.client.get("/")