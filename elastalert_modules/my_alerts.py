from elastalert.alerts import Alerter, BasicMatchString

class AwesomeNewAlerter(Alerter):
    required_options = {'output_file_path'}

    def __init__(self, *args, **kwargs):
        super(AwesomeNewAlerter, self).__init__(*args, **kwargs)
        print("1")

    def alert(self, matches):
        print("2")
        for match in matches:
            with open(self.rule['output_file_path'], "a") as output_file:
                match_string = str(BasicMatchString(self.rule, match))
                output_file.write(match_string)

    def get_info(self):
        print("3")
        return {
            'type': 'Awesome Alerter',
            'output_file': self.rule['output_file_path']
        }
